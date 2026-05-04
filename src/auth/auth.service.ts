import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from './interface/JwtPayload.js';
import { OAuth2Client } from 'google-auth-library';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { randomUUID } from 'crypto';
import { MailsService } from '../mails/mails.service.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { EmployeeCompanyRegisterDto } from './dto/employee-company-register.dto.js';

type SocialProfile = {
  email: string;
  fullName: string;
  avatar: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
  );
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailsService: MailsService,
  ) {}
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        Employee: {
          include: {
            Company: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload: JwtPayload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
      seeker_id: user.user_id,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.ACCESS_TOKEN_SECRET,
      expiresIn: '1h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: '7d',
    });

    await this.prisma.token.create({
      data: {
        user_id: user.user_id,
        token: refreshToken,
      },
    });

    // Format employee data for response

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        full_name: dto.full_name,
        phone: dto.phone,
        gender: dto.gender,
        user_image: dto.user_image,
        role: dto.role,
        is_active: dto.is_active ?? true,
        registration_date: new Date(),
      },
    });

    return {
      message: 'Đăng ký thành công',
      user: {
        id: user.user_id,
        email: user.email,
        full_name: dto.full_name,
        role: user.role,
        is_active: user.is_active,
        registration_date: user.registration_date,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token khong hop le');
    }

    const storedToken = await this.prisma.token.findUnique({
      where: { token: refreshToken },
      include: { User: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(
      refreshToken,
      {
        secret: process.env.REFRESH_TOKEN_SECRET,
      },
    );

    const newAccessToken = await this.jwtService.signAsync(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        seeker_id: payload.seeker_id,
      },
      {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn: '15m',
      },
    );
    return {
      access_token: newAccessToken,
    };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      return {
        message: 'Dang xuat thanh cong',
      };
    }

    await this.prisma.token.deleteMany({
      where: { token: refreshToken },
    });

    return {
      message: 'Đăng xuất thành công',
    };
  }
  async googleOneTapLogin(credential: string) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new BadRequestException('GOOGLE_CLIENT_ID chưa được cấu hình');
    }

    // Verify token từ Google
    const ticket = await this.googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const googlePayload = ticket.getPayload();
    if (!googlePayload || !googlePayload.email) {
      throw new ForbiddenException('Google token Invalid');
    }

    const email = googlePayload.email;
    const fullName = googlePayload.name || '';
    const avatar = googlePayload.picture || '';

    return this.socialLogin(email, fullName, avatar, 'Google');
  }

  async githubLogin(accessToken: string) {
    const githubProfileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'nestjs-auth-service',
      },
    });

    if (!githubProfileResponse.ok) {
      throw new ForbiddenException('Github access token invalid');
    }

    const githubProfile = (await githubProfileResponse.json()) as Partial<{
      email: string;
      name: string;
      avatar_url: string;
    }>;

    let email = githubProfile.email || '';
    const fullName = githubProfile.name || '';
    const avatar = githubProfile.avatar_url || '';

    if (!email) {
      const githubEmailResponse = await fetch(
        'https://api.github.com/user/emails',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'nestjs-auth-service',
          },
        },
      );

      if (!githubEmailResponse.ok) {
        throw new ForbiddenException('Không lấy được email từ Github');
      }

      const emails = (await githubEmailResponse.json()) as
        | Array<{ email: string; primary: boolean; verified: boolean }>
        | undefined;

      const selectedEmail =
        emails?.find((item) => item.primary && item.verified)?.email ||
        emails?.find((item) => item.verified)?.email ||
        emails?.[0]?.email ||
        '';

      email = selectedEmail;
    }

    if (!email) {
      throw new ForbiddenException('Github account không có email khả dụng');
    }

    return this.socialLogin(email, fullName, avatar, 'Github');
  }

  async facebookLogin(accessToken: string) {
    const url = new URL('https://graph.facebook.com/me');
    url.searchParams.set('fields', 'id,name,email,picture.type(large)');
    url.searchParams.set('access_token', accessToken);

    const facebookProfileResponse = await fetch(url.toString());

    if (!facebookProfileResponse.ok) {
      throw new ForbiddenException('Facebook access token invalid');
    }

    const facebookProfile = (await facebookProfileResponse.json()) as Partial<{
      email: string;
      name: string;
      picture: { data?: { url?: string } };
    }>;

    const email = facebookProfile.email || '';
    const fullName = facebookProfile.name || '';
    const avatar = facebookProfile.picture?.data?.url || '';

    if (!email) {
      throw new ForbiddenException('Facebook account chưa cung cấp email');
    }

    return this.socialLogin(email, fullName, avatar, 'Facebook');
  }

  private async socialLogin(
    email: string,
    fullName: string,
    avatar: string,
    providerName: string,
  ) {
    const socialProfile: SocialProfile = {
      email,
      fullName,
      avatar,
    };

    let user = await this.prisma.user.findUnique({
      where: { email: socialProfile.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: socialProfile.email,
          full_name:
            socialProfile.fullName || socialProfile.email.split('@')[0] || '',
          user_image: socialProfile.avatar,
          password: '',
          role: 'SEEKER',
          is_active: true,
          registration_date: new Date(),
        },
      });
    }

    const jwtPayload: JwtPayload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
      seeker_id: user.user_id,
    };

    const accessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: process.env.ACCESS_TOKEN_SECRET,
      expiresIn: '1h',
    });
    const refreshToken = await this.jwtService.signAsync(jwtPayload, {
      secret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: '7d',
    });

    await this.prisma.token.create({
      data: {
        user_id: user.user_id,
        token: refreshToken,
      },
    });

    return {
      message: `Login with ${providerName} success`,
      accessToken,
      refreshToken,
      user: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    await this.prisma.token.create({
      data: {
        token,
        user_id: user.user_id,
        type: 'RESET',
        expiresAt,
      },
    });

    this.mailsService.sendForgotPassword(
      user.email,
      user.full_name || '',
      token,
    );

    return { message: 'Reset link sent' };
  }
  async resetPassword(dto: ResetPasswordDto) {
    this.logger.debug(
      `[resetPassword] incoming token=${dto.token?.slice(0, 8) ?? 'undefined'}... passwordProvided=${typeof dto.password === 'string'} passwordLength=${dto.password?.length ?? 0}`,
    );

    if (!dto.password || typeof dto.password !== 'string') {
      this.logger.warn('[resetPassword] invalid password payload');
      throw new BadRequestException('Password phải là string hợp lệ');
    }

    const record = await this.prisma.token.findUnique({
      where: { token: dto.token },
      include: { User: true },
    });

    this.logger.debug(
      `[resetPassword] token lookup result found=${!!record} type=${record?.type ?? 'N/A'} expiresAt=${record?.expiresAt?.toISOString?.() ?? 'N/A'} userId=${record?.user_id ?? 'N/A'}`,
    );

    if (!record || record.type !== 'RESET') {
      this.logger.warn('[resetPassword] token invalid or wrong type');
      throw new BadRequestException('Token không hợp lệ');
    }

    if (record.expiresAt && record.expiresAt < new Date()) {
      this.logger.warn('[resetPassword] token expired');
      throw new BadRequestException('Token đã hết hạn');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    this.logger.debug('[resetPassword] password hashed successfully');

    await this.prisma.user.update({
      where: { user_id: record.user_id },
      data: { password: hashed },
    });
    this.logger.debug(
      `[resetPassword] updated password for userId=${record.user_id}`,
    );

    // Delete reset token after use
    await this.prisma.token.delete({
      where: { token_id: record.token_id },
    });
    this.logger.debug(
      `[resetPassword] deleted tokenId=${record.token_id} after successful reset`,
    );

    return { message: 'Password reset successful' };
  }
  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
        gender: true,
        phone: true,
        user_image: true,
        registration_date: true,
        Employee: {
          select: {
            employee_id: true,
            role: true,
            joined_date: true,
            Company: {
              select: {
                company_id: true,
                company_name: true,
                company_email: true,
                company_image: true,
                city: true,
                company_website_url: true,
                company_industry: true,
                company_size: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User không tồn tại');
    }

    return {
      id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      gender: user.gender,
      phone: user.phone,
      user_image: user.user_image,
      registration_date: user.registration_date,
      employee: user.Employee
        ? {
            employee_id: user.Employee.employee_id,
            role: user.Employee.role,
            joined_date: user.Employee.joined_date,
            company: user.Employee.Company,
          }
        : null,
    };
  }

  async employeeCompanyRegister(dto: EmployeeCompanyRegisterDto) {
    await this.mailsService.sendEmployeeCompanyRegisterMail(dto);

    return {
      message: 'Đã gửi thông tin đăng ký nhân viên đến hệ thống',
    };
  }
}

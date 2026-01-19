import {
  BadRequestException,
  ForbiddenException,
  Injectable,
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

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailsService: MailsService,
  ) {}
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
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
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.ACCESS_TOKEN_SECRET,
      expiresIn: '1h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: '7d',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.prisma.token.create({
      data: {
        user_id: user.user_id,
        token: refreshToken,
      },
    });

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.prisma.token.deleteMany({
      where: { token: refreshToken },
    });

    return {
      message: 'Đăng xuất thành công',
    };
  }
  async googleOneTapLogin(credential: string) {
    // Verify token từ Google
    const ticket = await this.googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new ForbiddenException('Google token Invalid');
    }

    const email = payload.email;
    const fullName = payload.name || '';
    const avatar = payload.picture || '';

    // Tim user
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          full_name: fullName,
          user_image: avatar,
          password: '', // Google login không cần password
          role: 'SEEKER',
          is_active: true,
          registration_date: new Date(),
        },
      });
    }

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
    return {
      message: 'Login with Google success',
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.prisma.token.create({
      data: {
        token,
        user_id: user.user_id,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.mailsService.sendForgotPassword(
      user.email,
      user.full_name || '',
      token,
    );

    return { message: 'Reset link sent' };
  }
  async resetPassword(dto: ResetPasswordDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const record = await this.prisma.resetToken.findUnique({
      where: { token: dto.token },
      include: { User: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!record || record.used) {
      throw new BadRequestException('Token không hợp lệ');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Token đã hết hạn');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      where: { user_id: record.user_id },
      data: { password: hashed },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.prisma.resetToken.update({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      where: { id: record.id },
      data: { used: true },
    });

    return { message: 'Password reset successful' };
  }
}

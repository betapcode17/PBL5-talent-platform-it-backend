import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto, UserRole } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { GoogleLoginDto } from './dto/google-login.dto.js';
import { OAuthCodeDto } from './dto/oauth-code.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { EmployeeCompanyRegisterDto } from './dto/employee-company-register.dto.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { ReqUser } from '../common/decorators/req-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @ApiOperation({ summary: 'Đăng ký' })
  @ApiBody({
    type: RegisterDto,
    examples: {
      seeker: {
        summary: 'Ứng viên (SEEKER)',
        value: {
          email: 'johndoe@example.com',
          password: '1232@asdS',
          full_name: 'John Doe',
          phone: '0901234567',
          gender: 'Male',
          user_image: null,
          role: UserRole.SEEKER,
          is_active: true,
        } as RegisterDto,
      },
    },
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiBody({
    type: LoginDto,
    examples: {
      user_1: {
        summary: 'User thường',
        value: {
          email: 'johndoe@example.com',
          password: '1232@asdS',
        } as LoginDto,
      },
      employee: {
        summary: 'nhà tuyển dụng',
        value: {
          email: 'hr@techcorp.com',
          password: 'password123',
        },
      },
      admin: {
        summary: 'Admin',
        value: {
          email: 'admin@system.com',
          password: 'Admin@123',
        } as LoginDto,
      },
    },
  })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
  @ApiOperation({ summary: 'Đăng xuất' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refresh_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refresh_token'],
    },
  })
  @Post('logout')
  logout(@Body('refresh_token') token: string) {
    return this.authService.logout(token);
  }
  @ApiOperation({ summary: 'Lấy lại token' })
  @Post('refresh-token')
  refresh(@Body('refresh_token') token: string) {
    return this.authService.refreshToken(token);
  }
  @ApiOperation({ summary: 'Đăng nhập bằng google' })
  @Post('google')
  @ApiBody({
    type: GoogleLoginDto,
    examples: {
      example: {
        value: {
          credential: 'GOOGLE_ID_TOKEN',
        },
      },
    },
  })
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleOneTapLogin(dto.credential);
  }

  @ApiOperation({ summary: 'Đăng nhập bằng Github' })
  @Post('github')
  @ApiBody({
    type: OAuthCodeDto,
    examples: {
      example: {
        value: {
          code: 'GITHUB_AUTHORIZATION_CODE',
        },
      },
    },
  })
  async githubLogin(@Body() dto: OAuthCodeDto) {
    const accessToken = await this.exchangeGithubCode(dto.code);
    return this.authService.githubLogin(accessToken);
  }

  @ApiOperation({ summary: 'Đăng nhập bằng Facebook' })
  @Post('facebook')
  @ApiBody({
    type: OAuthCodeDto,
    examples: {
      example: {
        value: {
          code: 'FACEBOOK_AUTHORIZATION_CODE',
        },
      },
    },
  })
  async facebookLogin(@Body() dto: OAuthCodeDto) {
    const accessToken = await this.exchangeFacebookCode(dto.code);
    return this.authService.facebookLogin(accessToken);
  }

  @Post('github/callback')
  async githubCallback(@Body() dto: OAuthCodeDto) {
    const accessToken = await this.exchangeGithubCode(dto.code);
    return this.authService.githubLogin(accessToken);
  }

  @Post('facebook/callback')
  async facebookCallback(@Body() dto: OAuthCodeDto) {
    const accessToken = await this.exchangeFacebookCode(dto.code);
    return this.authService.facebookLogin(accessToken);
  }
  @ApiOperation({ summary: 'Quên mật khẩu' })
  @ApiBody({
    type: ForgotPasswordDto,
    examples: {
      example: {
        value: {
          email: 'johndoe@example.com',
        },
      },
    },
  })
  @Post('forgot-password')
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }
  @ApiOperation({ summary: 'Reset lại mật khẩu' })
  @Post('reset-password')
  @ApiBody({
    type: ResetPasswordDto,
    examples: {
      example: {
        value: {
          token: 'RESET_PASSWORD_TOKEN',
          password: 'NewPassword@123',
        },
      },
    },
  })
  reset(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiOperation({ summary: 'Đăng ký nhân viên công ty (chỉ gửi mail)' })
  @ApiBody({
    type: EmployeeCompanyRegisterDto,
    examples: {
      example: {
        value: {
          full_name: 'Nguyen Van A',
          role: 'HR',
          email: 'hr.company@example.com',
          phone: '0901234567',
          company_name: 'ABC Tech',
          company_address: 'Da Nang',
          company_website_url: 'https://abctech.vn',
        } as EmployeeCompanyRegisterDto,
      },
    },
  })
  @Post('employee-company-register')
  employeeCompanyRegister(@Body() dto: EmployeeCompanyRegisterDto) {
    return this.authService.employeeCompanyRegister(dto);
  }

  private async exchangeGithubCode(code: string): Promise<string> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Thiếu cấu hình GITHUB_CLIENT_ID hoặc GITHUB_CLIENT_SECRET',
      );
    }

    const response = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      },
    );

    if (!response.ok) {
      throw new BadRequestException('Không thể exchange Github code');
    }

    const payload = (await response.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!payload.access_token) {
      throw new BadRequestException(
        payload.error_description ||
          payload.error ||
          'Github code không hợp lệ',
      );
    }

    return payload.access_token;
  }

  private async exchangeFacebookCode(code: string): Promise<string> {
    const clientId = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        'Thiếu cấu hình FACEBOOK_APP_ID, FACEBOOK_APP_SECRET hoặc FACEBOOK_REDIRECT_URI',
      );
    }

    const url = new URL('https://graph.facebook.com/oauth/access_token');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('code', code);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new BadRequestException('Không thể exchange Facebook code');
    }

    const payload = (await response.json()) as {
      access_token?: string;
      error?: { message?: string };
    };

    if (!payload.access_token) {
      throw new BadRequestException(
        payload.error?.message || 'Facebook code không hợp lệ',
      );
    }

    return payload.access_token;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@ReqUser() user) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.authService.getMe(user.sub);
  }
}

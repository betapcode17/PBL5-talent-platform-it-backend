import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto, UserRole } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { GoogleLoginDto } from './dto/google-login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

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
      employee: {
        summary: 'Nhân viên tuyển dụng (EMPLOYEE)',
        value: {
          email: 'hr@company.com',
          password: '1232@asdS',
          full_name: 'Michael Smith',
          phone: '0987654321',
          gender: 'Male',
          user_image: null,
          role: UserRole.EMPLOYEE,
          is_active: true,
        } as RegisterDto,
      },
      admin: {
        summary: 'Quản trị viên (ADMIN)',
        value: {
          email: 'admin@system.com',
          password: 'Admin@123',
          full_name: 'System Admin',
          phone: null,
          gender: null,
          user_image: null,
          role: UserRole.ADMIN,
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
          new_password: 'NewPassword@123',
        },
      },
    },
  })
  reset(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

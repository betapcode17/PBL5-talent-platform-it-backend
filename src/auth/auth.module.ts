import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { PrismaService } from '../prisma.service.js';
import { MailsModule } from '../mails/mails.module.js';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret:
        process.env.ACCESS_TOKEN_SECRET ||
        'default-secret-key-change-in-production',
      signOptions: { expiresIn: '1h' },
    }),
    MailsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
export class AuthModule {}

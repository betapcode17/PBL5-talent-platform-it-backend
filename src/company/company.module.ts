import { Module } from '@nestjs/common';
import { CompanyService } from './company.service.js';
import { CompanyController } from './company.controller.js';
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { MailsModule } from '../mails/mails.module.js';

@Module({
  imports: [MailsModule],
  controllers: [CompanyController],
  providers: [CompanyService, PrismaService, JwtAuthGuard],
  exports: [CompanyService],
})
export class CompanyModule {}

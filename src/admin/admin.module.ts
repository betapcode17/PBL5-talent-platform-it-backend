import { Module } from '@nestjs/common';
import { AdminGuard } from '../job-types/guards/admin.guard.js';
import { MailsModule } from '../mails/mails.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [MailsModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}

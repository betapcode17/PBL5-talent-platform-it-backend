import { Module } from '@nestjs/common';
import { MailsModule } from '../mails/mails.module.js';
import { UploadModule } from '../upload/upload.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

@Module({
  imports: [MailsModule, UploadModule, NotificationsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}

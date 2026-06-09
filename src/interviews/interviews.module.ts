import { Module } from '@nestjs/common';
import { InterviewsService } from './interviews.service.js';
import { InterviewsController } from './interviews.controller.js';
import { MailsModule } from '../mails/mails.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [MailsModule, NotificationsModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}

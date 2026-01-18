import { Module } from '@nestjs/common';
import { MailsService } from './mails.service.js';
import { MailerModule } from '../mailer/mailer.module.js';

@Module({
  imports: [MailerModule],
  providers: [MailsService],
  exports: [MailsService],
})
export class MailsModule {}

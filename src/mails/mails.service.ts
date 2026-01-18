import { Injectable } from '@nestjs/common';
import { MailerService } from '../mailer/mailer.service.js';

@Injectable()
export class MailsService {
  constructor(private readonly mailer: MailerService) {}

  sendForgotPassword(email: string, username: string, token: string) {
    void this.mailer.sendResetPasswordMail(email, username, token);
  }
}

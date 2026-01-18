import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

@Injectable()
export class MailerService {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  private transporter = nodemailer.createTransport({
    host: process.env.MAILER_HOST,
    port: Number(process.env.MAILER_PORT),
    secure: false,
    auth: {
      user: process.env.MAILER_USER,
      pass: process.env.MAILER_PASSWORD,
    },
  });

  async sendResetPasswordMail(to: string, username: string, token: string) {
    const templatePath = path.join(
      process.cwd(),
      'src',
      'mails',
      'templates',
      'reset-password.hbs',
    );

    const source = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(source);

    const html = template({
      username,
      resetLink: `${process.env.APP_CLIENTURL}/reset-password?token=${token}`,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.transporter.sendMail({
      to,
      subject: 'Reset Password',
      html,
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { EmployeeCompanyRegisterDto } from 'src/auth/dto/employee-company-register.dto.js';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  private readonly mailerPort = Number(process.env.MAILER_PORT ?? 587);

  private readonly mailerSecure =
    process.env.MAILER_SECURE === 'true' || this.mailerPort === 465;

  private readonly rejectUnauthorizedTls =
    process.env.MAILER_TLS_REJECT_UNAUTHORIZED === 'false'
      ? false
      : process.env.MAILER_TLS_ALLOW_SELF_SIGNED === 'true'
        ? false
        : true;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  private transporter = nodemailer.createTransport({
    host: process.env.MAILER_HOST,
    port: this.mailerPort,
    secure: this.mailerSecure,
    auth: {
      user: process.env.MAILER_USER,
      pass: process.env.MAILER_PASSWORD,
    },
    tls: {
      rejectUnauthorized: this.rejectUnauthorizedTls,
    },
  });

  private buildResetLink(baseUrl: string, resetPath: string, token: string) {
    const url = new URL(baseUrl);
    const safePath = (resetPath?.trim() || '/reset-password').replace('#', '');

    // BrowserRouter: "/reset-password" hoặc "/auth/reset-password"
    const normalizedPath = safePath.startsWith('/') ? safePath : `/${safePath}`;
    const [pathname, query = ''] = normalizedPath.split('?');

    url.pathname = pathname;
    const params = new URLSearchParams(query);
    params.set('token', token);
    url.search = params.toString();
    url.hash = '';

    return url.toString();
  }

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

    const frontendBaseUrl = (
      process.env.APP_CLIENTURL ??
      process.env.FRONTEND_URL ??
      'http://localhost:5173'
    ).replace(/\/+$/, '');

    const configuredResetPath =
      process.env.RESET_PASSWORD_PATH ?? 'reset-password';

    const resetLink = this.buildResetLink(
      frontendBaseUrl,
      configuredResetPath,
      token,
    );

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`Reset password link for ${to}: ${resetLink}`);
    }

    const html = template({
      username,
      resetLink,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.transporter.sendMail({
      to,
      subject: 'Reset Password',
      html,
    });
  }
  async sendRegisterEmployeeMail(payload: EmployeeCompanyRegisterDto) {
    const to = process.env.MAILER_USER;
    if (!to) {
      this.logger.error('Thiếu email nhận thông báo hệ thống');
      return;
    }
    const subject = 'Yeu cau dang ky employee moi';
    const html =
      '<h2>Thong tin dang ky employee moi</h2>' +
      '<p><b>Ho ten:</b> ' +
      payload.full_name +
      '</p>' +
      '<p><b>Vai tro:</b> ' +
      payload.role +
      '</p>' +
      '<p><b>Email:</b> ' +
      payload.email +
      '</p>' +
      '<p><b>So dien thoai:</b> ' +
      payload.phone +
      '</p>' +
      '<p><b>Cong ty:</b> ' +
      payload.company_name +
      '</p>' +
      '<p><b>Dia chi cong ty:</b> ' +
      payload.company_address +
      '</p>' +
      '<p><b>Website:</b> ' +
      (payload.company_website_url || 'Khong co');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.transporter.sendMail({
      to,
      subject,
      html,
    });
    this.logger.log('Da gui mail thong bao dang ky employee cho he thong');
  }
  async sendNewAccountToEmployeeMail(email: string, password: string) {
    const to = email;
    if (!to) {
      this.logger.error('Thiếu email nhận tài khoản employee');
      return;
    }
    const subject = 'Tai khoan employee moi';
    const html =
      '<h2>Tai khoan employee cua ban da duoc tao</h2>' +
      '<p><b>Email:</b> ' +
      email +
      '</p>' +
      '<p><b>Mat khau tam:</b> ' +
      password +
      '</p>' +
      '<p>Vui long dang nhap va doi mat khau ngay sau lan dau tien.</p>';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.transporter.sendMail({
      to,
      subject,
      html,
    });

    this.logger.log(`Da gui tai khoan employee moi den ${email}`);
  }
}

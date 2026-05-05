import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { EmployeeCompanyRegisterDto } from 'src/auth/dto/employee-company-register.dto.js';

export type InterviewMailPayload = {
  recipientEmail: string;
  recipientName?: string | null;
  action: 'scheduled' | 'rescheduled' | 'cancelled' | 'completed';
  interviewId: number;
  schedule: Date;
  duration: number;
  type: string;
  link?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  counterpartName?: string | null;
  reason?: string | null;
  feedback?: string | null;
  rating?: number | null;
};

export type ApplicationMailPayload = {
  recipientEmail: string;
  recipientName?: string | null;
  action: 'submitted' | 'accepted' | 'rejected';
  applicationId: number;
  jobTitle?: string | null;
  companyName?: string | null;
  seekerName?: string | null;
  recruiterName?: string | null;
  reason?: string | null;
};

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
    const to = payload.email;
    if (!to) {
      this.logger.error('Thiếu email người nhận đăng ký employee');
      return;
    }
    const subject = 'Xac nhan dang ky employee moi';
    const html =
      '<h2>Dang ky employee cua ban da duoc ghi nhan</h2>' +
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

  async sendInterviewUpdateMail(payload: InterviewMailPayload) {
    if (!payload.recipientEmail) {
      this.logger.warn('Bo qua interview email vi thieu recipientEmail');
      return;
    }

    const scheduleText = payload.schedule.toISOString();
    const actionLabel = this.getInterviewActionLabel(payload.action);
    const subject = `[Interview] ${actionLabel} - #${payload.interviewId}`;

    const htmlParts = [
      `<h2>${actionLabel}</h2>`,
      `<p>Xin chao ${payload.recipientName || 'ban'},</p>`,
      `<p>Thong tin interview #${payload.interviewId} vua duoc cap nhat.</p>`,
      `<p><b>Loai:</b> ${payload.type}</p>`,
      `<p><b>Thoi gian:</b> ${scheduleText}</p>`,
      `<p><b>Thoi luong:</b> ${payload.duration} phut</p>`,
    ];

    if (payload.companyName) {
      htmlParts.push(`<p><b>Cong ty:</b> ${payload.companyName}</p>`);
    }

    if (payload.jobTitle) {
      htmlParts.push(`<p><b>Vi tri:</b> ${payload.jobTitle}</p>`);
    }

    if (payload.counterpartName) {
      htmlParts.push(
        `<p><b>Nguoi lien quan:</b> ${payload.counterpartName}</p>`,
      );
    }

    if (payload.link) {
      const isUrl =
        payload.link.startsWith('http://') ||
        payload.link.startsWith('https://');
      htmlParts.push(
        isUrl
          ? `<p><b>Link/Location:</b> <a href="${payload.link}">${payload.link}</a></p>`
          : `<p><b>Link/Location:</b> ${payload.link}</p>`,
      );
    }

    if (payload.reason) {
      htmlParts.push(`<p><b>Ly do:</b> ${payload.reason}</p>`);
    }

    if (payload.feedback) {
      htmlParts.push(`<p><b>Feedback:</b> ${payload.feedback}</p>`);
    }

    if (payload.rating !== undefined && payload.rating !== null) {
      htmlParts.push(`<p><b>Rating:</b> ${payload.rating}/5</p>`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.transporter.sendMail({
      to: payload.recipientEmail,
      subject,
      html: htmlParts.join(''),
    });

    this.logger.log(
      `Da gui interview ${payload.action} email den ${payload.recipientEmail}`,
    );
  }

  async sendApplicationUpdateMail(payload: ApplicationMailPayload) {
    if (!payload.recipientEmail) {
      this.logger.warn('Bo qua application email vi thieu recipientEmail');
      return;
    }

    const actionLabel = this.getApplicationActionLabel(payload.action);
    const subject = `[Application] ${actionLabel} - #${payload.applicationId}`;

    const htmlParts = [
      `<h2>${actionLabel}</h2>`,
      `<p>Xin chao ${payload.recipientName || 'ban'},</p>`,
      `<p>Application #${payload.applicationId} vua duoc cap nhat.</p>`,
    ];

    if (payload.jobTitle) {
      htmlParts.push(`<p><b>Vi tri:</b> ${payload.jobTitle}</p>`);
    }

    if (payload.companyName) {
      htmlParts.push(`<p><b>Cong ty:</b> ${payload.companyName}</p>`);
    }

    if (payload.seekerName) {
      htmlParts.push(`<p><b>Ung vien:</b> ${payload.seekerName}</p>`);
    }

    if (payload.recruiterName) {
      htmlParts.push(`<p><b>Recruiter:</b> ${payload.recruiterName}</p>`);
    }

    if (payload.reason) {
      htmlParts.push(`<p><b>Ly do:</b> ${payload.reason}</p>`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.transporter.sendMail({
      to: payload.recipientEmail,
      subject,
      html: htmlParts.join(''),
    });

    this.logger.log(
      `Da gui application ${payload.action} email den ${payload.recipientEmail}`,
    );
  }

  private getInterviewActionLabel(
    action: InterviewMailPayload['action'],
  ): string {
    switch (action) {
      case 'scheduled':
        return 'Interview moi duoc tao';
      case 'rescheduled':
        return 'Interview da duoc doi lich';
      case 'cancelled':
        return 'Interview da bi huy';
      case 'completed':
        return 'Interview da hoan thanh';
      default:
        return 'Interview da duoc cap nhat';
    }
  }

  private getApplicationActionLabel(
    action: ApplicationMailPayload['action'],
  ): string {
    switch (action) {
      case 'submitted':
        return 'Co don ung tuyen moi';
      case 'accepted':
        return 'Don ung tuyen da duoc chap nhan';
      case 'rejected':
        return 'Don ung tuyen da bi tu choi';
      default:
        return 'Don ung tuyen da duoc cap nhat';
    }
  }
}

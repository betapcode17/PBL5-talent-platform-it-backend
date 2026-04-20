import { Injectable } from '@nestjs/common';
import { MailerService } from '../mailer/mailer.service.js';
import { EmployeeCompanyRegisterDto } from 'src/auth/dto/employee-company-register.dto.js';

@Injectable()
export class MailsService {
  constructor(private readonly mailer: MailerService) {}

  sendForgotPassword(email: string, username: string, token: string) {
    void this.mailer.sendResetPasswordMail(email, username, token);
  }
  async sendEmployeeCompanyRegisterMail(payload: EmployeeCompanyRegisterDto) {
    await this.mailer.sendRegisterEmployeeMail(payload);
  }
  sendNewAccountToEmployee(email: string, password: string) {
    void this.mailer.sendNewAccountToEmployeeMail(email, password);
  }
}

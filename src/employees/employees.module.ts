import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { EmployeesController } from './employees.controller.js';
import { MailsModule } from '../mails/mails.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [MailsModule, NotificationsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}

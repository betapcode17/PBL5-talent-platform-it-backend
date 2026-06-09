import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { EmployeeGuard } from './guards/employee.guard.js';

@Module({
  imports: [NotificationsModule],
  controllers: [JobsController],
  providers: [JobsService, EmployeeGuard],
})
export class JobsModule {}

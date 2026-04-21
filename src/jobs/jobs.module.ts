import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { EmployeeGuard } from './guards/employee.guard.js';

@Module({
  controllers: [JobsController],
  providers: [JobsService, EmployeeGuard],
})
export class JobsModule {}

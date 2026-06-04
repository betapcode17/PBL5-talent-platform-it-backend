import { Module } from '@nestjs/common';
import { EmployeeGuard } from '../jobs/guards/employee.guard.js';
import { LikesController } from './likes.controller.js';
import { LikesService } from './likes.service.js';

@Module({
  controllers: [LikesController],
  providers: [LikesService, EmployeeGuard],
})
export class LikesModule {}

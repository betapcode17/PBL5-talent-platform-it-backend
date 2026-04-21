import { Module } from '@nestjs/common';
import { AdminGuard } from '../job-types/guards/admin.guard.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}

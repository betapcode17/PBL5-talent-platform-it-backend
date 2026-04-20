import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { JobTypesController } from './job-types.controller.js';
import { JobTypesService } from './job-types.service.js';
import { AdminGuard } from './guards/admin.guard.js';

@Module({
  controllers: [JobTypesController, CategoriesController],
  providers: [JobTypesService, AdminGuard],
})
export class JobTypesModule {}

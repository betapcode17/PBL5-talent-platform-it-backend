import { Module } from '@nestjs/common';
import { AiScreeningController } from './ai-screening.controller.js';
import { AiScreeningQueueService } from './ai-screening-queue.service.js';
import { AiScreeningRunsController } from './ai-screening-runs.controller.js';
import { AiScreeningService } from './ai-screening.service.js';

@Module({
  controllers: [AiScreeningController, AiScreeningRunsController],
  providers: [AiScreeningService, AiScreeningQueueService],
  exports: [AiScreeningService, AiScreeningQueueService],
})
export class AiScreeningModule {}

import { Module } from '@nestjs/common';
import { UploadModule } from '../upload/upload.module.js';
import { CvController } from './cv.controller.js';
import { CvService } from './cv.service.js';

@Module({
  imports: [UploadModule],
  controllers: [CvController],
  providers: [CvService],
})
export class CvModule {}

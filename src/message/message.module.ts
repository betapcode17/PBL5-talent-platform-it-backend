import { Module } from '@nestjs/common';
import { MessageService } from './message.service.js';
import { MessageController } from './message.controller.js';

@Module({
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}

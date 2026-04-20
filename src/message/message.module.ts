import { Module } from '@nestjs/common';
import { MessageService } from './message.service.js';
import { MessageController } from './message.controller.js';
import { ChatModule } from '../chat/chat.module.js';

@Module({
  imports: [ChatModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService], // Export for use in other modules if needed
})
export class MessageModule {}

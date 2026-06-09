import { Module } from '@nestjs/common';
import { MessageService } from './message.service.js';
import { MessageController } from './message.controller.js';
import { ChatModule } from '../chat/chat.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [ChatModule, NotificationsModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService], // Export for use in other modules if needed
})
export class MessageModule {}

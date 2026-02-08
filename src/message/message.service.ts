import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service.js';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}
  async sendMessage(
    chatId: number,
    content: string,
    senderType: 'SEEKER' | 'EMPLOYEE',
    senderId: number,
  ) {
    await this.prisma.chat.update({
      where: { chat_id: chatId },
      data: {
        last_message_at: new Date(),
      },
    });
    return this.prisma.message.create({
      data: {
        chat_id: chatId,
        content: content,
        sender_type: senderType,
        sender_id: senderId,
      },
    });
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(
    chatId: number,
    content: string,
    senderType: 'SEEKER' | 'EMPLOYEE',
    senderId: number,
  ) {
    // Validate inputs
    if (!chatId || !content || !senderType || !senderId) {
      throw new BadRequestException('Tất cả các trường là bắt buộc');
    }

    if (content.trim().length === 0) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }

    // Verify chat exists
    const chat = await this.prisma.chat.findUnique({
      where: { chat_id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat không tồn tại');
    }

    // Update last_message_at and create message in transaction-like operation
    const [message] = await Promise.all([
      this.prisma.message.create({
        data: {
          chat_id: chatId,
          content: content.trim(),
          sender_type: senderType,
          sender_id: senderId,
        },
      }),
      this.prisma.chat.update({
        where: { chat_id: chatId },
        data: {
          last_message_at: new Date(),
        },
      }),
    ]);

    return message;
  }

  async getMessages(chatId: number, limit: number = 50, offset: number = 0) {
    if (limit > 100) limit = 100; // Prevent excessive data fetching
    if (offset < 0) offset = 0;

    return this.prisma.message.findMany({
      where: { chat_id: chatId },
      take: limit,
      skip: offset,
      orderBy: { sent_at: 'desc' },
      select: {
        message_id: true,
        content: true,
        sent_at: true,
        sender_type: true,
        sender_id: true,
        is_read: true,
      },
    });
  }

  async markAsRead(messageId: number) {
    return this.prisma.message.update({
      where: { message_id: messageId },
      data: { is_read: true },
    });
  }
  async editMessage(messageId: number, newContent: string) {
    if (newContent.trim().length === 0) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }
    return this.prisma.message.update({
      where: { message_id: messageId },
      data: { content: newContent.trim() },
    });
  }
}

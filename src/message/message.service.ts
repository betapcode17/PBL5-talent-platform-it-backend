import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationType } from '../generated/prisma/client.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma.service.js';
import { ChatGateway } from '../chat/gateway/chat.gateway.js';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

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

    if (senderType === 'SEEKER' && chat.seeker_id !== senderId) {
      throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
    }

    if (senderType === 'EMPLOYEE') {
      const employee = await this.prisma.employee.findUnique({
        where: { employee_id: senderId },
      });
      if (!employee || employee.company_id !== chat.company_id) {
        throw new ForbiddenException('Bạn không thuộc công ty trong cuộc trò chuyện này');
      }
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

    // Broadcast message via WebSocket to all connected clients in this chat room
    try {
      this.chatGateway.broadcastMessage(message);
    } catch (err) {
      console.error('Failed to broadcast message via WebSocket:', err);
      // Don't fail the request if WebSocket broadcast fails, message is still saved
    }

    try {
      await this.dispatchChatNotification(chat, message);
    } catch (err) {
      console.error('Failed to dispatch notification from chat message:', err);
    }

    return message;
  }

  async getMessages(
    chatId: number,
    limit: number = 50,
    offset: number = 0,
    user?: { sub: number; role: string },
  ) {
    if (limit > 100) limit = 100; // Prevent excessive data fetching
    if (offset < 0) offset = 0;

    if (user && user.role !== 'ADMIN') {
      const chat = await this.prisma.chat.findUnique({
        where: { chat_id: chatId },
      });
      if (!chat) {
        throw new NotFoundException('Chat không tồn tại');
      }
      if (user.role === 'SEEKER' && chat.seeker_id !== user.sub) {
        throw new ForbiddenException('Bạn không có quyền xem cuộc trò chuyện này');
      }
      if (user.role === 'EMPLOYEE') {
        const employee = await this.prisma.employee.findUnique({
          where: { employee_id: user.sub },
        });
        if (!employee || employee.company_id !== chat.company_id) {
          throw new ForbiddenException('Bạn không có quyền xem cuộc trò chuyện này');
        }
      }
    }

    const messages = await this.prisma.message.findMany({
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

    // Bổ sung tên employee nếu sender_type là EMPLOYEE (Batch query tránh N+1)
    const employeeIds = Array.from(
      new Set(
        messages
          .filter((msg) => msg.sender_type === 'EMPLOYEE')
          .map((msg) => msg.sender_id),
      ),
    );

    let employeeMap = new Map<number, string | null>();
    if (employeeIds.length > 0) {
      const employees = await this.prisma.employee.findMany({
        where: { employee_id: { in: employeeIds } },
        select: {
          employee_id: true,
          User: { select: { full_name: true } },
        },
      });
      employeeMap = new Map(
        employees.map((e) => [e.employee_id, e.User?.full_name || null]),
      );
    }

    return messages.map((msg) => ({
      ...msg,
      employee_name:
        msg.sender_type === 'EMPLOYEE'
          ? employeeMap.get(msg.sender_id) || null
          : null,
    }));
  }

  async markAsRead(messageId: number) {
    return this.prisma.message.update({
      where: { message_id: messageId },
      data: { is_read: true },
    });
  }
  async editMessage(
    messageId: number,
    newContent: string,
    user?: { sub: number; role: string },
  ) {
    if (newContent.trim().length === 0) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }
    const message = await this.prisma.message.findUnique({
      where: { message_id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }
    if (user && user.role !== 'ADMIN' && message.sender_id !== user.sub) {
      throw new ForbiddenException('Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình');
    }
    return this.prisma.message.update({
      where: { message_id: messageId },
      data: { content: newContent.trim() },
    });
  }

  private async dispatchChatNotification(
    chat: { chat_id: number; seeker_id: number; company_id: number },
    message: {
      message_id: number;
      content: string;
      sender_type: 'SEEKER' | 'EMPLOYEE';
      sender_id: number;
    },
  ) {
    if (message.sender_type === 'EMPLOYEE') {
      await this.notificationsService.createNotification({
        title: 'Công ty đã phản hồi tin nhắn',
        message: message.content.slice(0, 180),
        type: NotificationType.COMPANY_REPLIED,
        role: 'SEEKER',
        receiverId: chat.seeker_id,
        senderId: message.sender_id,
        metadata: {
          chatId: chat.chat_id,
          companyId: chat.company_id,
          messageId: message.message_id,
        },
      });
      return;
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        company_id: chat.company_id,
        User: {
          is: {
            is_active: true,
          },
        },
      },
      select: {
        employee_id: true,
      },
    });

    await this.notificationsService.notifyUsers(
      employees.map((employee) => ({
        title: 'Có tin nhắn mới từ seeker',
        message: message.content.slice(0, 180),
        type: NotificationType.SEEKER_MESSAGE,
        role: 'EMPLOYEE',
        receiverId: employee.employee_id,
        senderId: chat.seeker_id,
        dedupeKey: `seeker-message:${chat.chat_id}:${message.message_id}`,
        metadata: {
          chatId: chat.chat_id,
          companyId: chat.company_id,
          seekerId: chat.seeker_id,
          messageId: message.message_id,
        },
      })),
    );
  }
}

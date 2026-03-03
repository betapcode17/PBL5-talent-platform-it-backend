import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { PrismaService } from '../../prisma.service.js';
import { Logger } from '@nestjs/common';

interface IMessagePayload {
  chat_id: number;
  content: string;
  sender_type: 'SEEKER' | 'EMPLOYEE';
  sender_id: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, number>(); // socket.id -> user_id

  constructor(private prisma: PrismaService) {}
  //Log ra để biết đã connect hay disconnect, đồng thời lưu trữ user_id của client để sau này có thể kiểm tra quyền truy cập khi họ gửi tin nhắn hoặc tham gia chat
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('joinChat')
  async handleJoin(
    client: Socket,
    data: { chatId: number; userId: number; userRole: string },
  ) {
    try {
      if (!data.chatId || !data.userId) {
        client.emit('error', { message: 'chatId và userId là bắt buộc' });
        return;
      }

      // Verify chat exists
      const chat = await this.prisma.chat.findUnique({
        where: { chat_id: data.chatId },
      });

      if (!chat) {
        client.emit('error', { message: 'Chat không tồn tại' });
        return;
      }

      // Verify user has access to this chat
      if (data.userRole === 'SEEKER' && chat.seeker_id !== data.userId) {
        client.emit('error', {
          message: 'Bạn không có quyền truy cập chat này',
        });
        return;
      }

      if (data.userRole === 'EMPLOYEE') {
        const employee = await this.prisma.employee.findUnique({
          where: { employee_id: data.userId },
        });
        if (!employee || employee.company_id !== chat.company_id) {
          client.emit('error', {
            message: 'Bạn không có quyền truy cập chat này',
          });
          return;
        }
      }

      this.connectedUsers.set(client.id, data.userId);
      void client.join(`chat:${data.chatId}`);
      this.logger.log(`User ${data.userId} joined chat ${data.chatId}`);
    } catch (error) {
      this.logger.error('Error in handleJoin:', error);
      client.emit('error', { message: 'Lỗi trong quá trình tham gia chat' });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSend(client: Socket, payload: IMessagePayload) {
    try {
      // Validate payload
      if (
        !payload.chat_id ||
        !payload.content ||
        !payload.sender_type ||
        !payload.sender_id
      ) {
        client.emit('error', { message: 'Dữ liệu tin nhắn không hợp lệ' });
        return;
      }

      if (payload.content.trim().length === 0) {
        client.emit('error', {
          message: 'Nội dung tin nhắn không được để trống',
        });
        return;
      }

      // Verify chat exists
      const chat = await this.prisma.chat.findUnique({
        where: { chat_id: payload.chat_id },
      });

      if (!chat) {
        client.emit('error', { message: 'Chat không tồn tại' });
        return;
      }

      // Create message
      const msg = await this.prisma.message.create({
        data: {
          chat_id: payload.chat_id,
          content: payload.content.trim(),
          sender_type: payload.sender_type,
          sender_id: payload.sender_id,
        },
      });

      // Update last_message_at in chat
      await this.prisma.chat.update({
        where: { chat_id: payload.chat_id },
        data: { last_message_at: new Date() },
      });

      // Broadcast to all users in this chat
      this.server.to(`chat:${payload.chat_id}`).emit('newMessage', msg);
      this.logger.log(
        `Message created: ${msg.message_id} in chat ${payload.chat_id}`,
      );
    } catch (error) {
      this.logger.error('Error in handleSend:', error);
      client.emit('error', { message: 'Lỗi trong quá trình gửi tin nhắn' });
    }
  }
}

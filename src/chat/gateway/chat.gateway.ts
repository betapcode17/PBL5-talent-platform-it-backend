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
import { JwtService } from '@nestjs/jwt';

interface IMessagePayload {
  chat_id: number;
  content: string;
  sender_type: 'SEEKER' | 'EMPLOYEE';
  sender_id: number;
}

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server | undefined;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, number>(); // socket.id -> user_id

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  //Log ra để biết đã connect hay disconnect, đồng thời lưu trữ user_id của client để sau này có thể kiểm tra quyền truy cập khi họ gửi tin nhắn hoặc tham gia chat
  handleConnection(client: AuthenticatedSocket) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const token = (client.handshake?.auth as any)?.token;
      this.logger.debug(
        `[CONNECT] Socket ${client.id} - Token present: ${!!token}`,
      );

      if (!token) {
        this.logger.warn(
          `[CONNECT] ❌ No token - disconnecting socket ${client.id}`,
        );
        client.disconnect();
        return;
      }

      try {
        const decoded: any = this.jwtService.verify(token);
        client.userId = decoded.sub;
        client.userRole = decoded.role;
        this.connectedUsers.set(client.id, decoded.sub);
        this.logger.log(
          `✅ [CONNECT] User ${decoded.sub} (${decoded.role}) - Socket: ${client.id}`,
        );
      } catch (err) {
        const errorMsg = (err as any).message;
        this.logger.warn(
          `⚠️ [CONNECT] Token error (${errorMsg}) - Socket: ${client.id}`,
        );
        // Allow connection but mark as unauthenticated
        // Client can send 'auth:refresh' event to re-authenticate
        client.userId = undefined;
        client.userRole = undefined;
        client.emit('auth:required', {
          message: 'Token expired or invalid, please login again',
        });
      }
    } catch (error) {
      this.logger.error(`[CONNECT] Unexpected error:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    this.logger.log(`👋 [DISCONNECT] User ${userId} - Socket: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    client: AuthenticatedSocket,
    data: { chatId: number; userId: number; userRole: string },
  ) {
    try {
      // Check if user is authenticated
      if (!client.userId || !client.userRole) {
        this.logger.warn(
          `⚠️ [JOIN] Unauthenticated socket attempt - Socket: ${client.id}`,
        );
        client.emit('error', { message: 'Vui lòng đăng nhập lại' });
        return;
      }

      if (!data.chatId || !data.userId) {
        this.logger.error(`[JOIN] Missing chatId or userId`);
        client.emit('error', { message: 'chatId và userId là bắt buộc' });
        return;
      }

      // Verify chat exists
      const chat = await this.prisma.chat.findUnique({
        where: { chat_id: data.chatId },
      });

      if (!chat) {
        this.logger.error(`[JOIN] Chat not found: ${data.chatId}`);
        client.emit('error', { message: 'Chat không tồn tại' });
        return;
      }

      // Verify user has access to this chat
      if (data.userRole === 'SEEKER' && chat.seeker_id !== data.userId) {
        this.logger.warn(
          `[JOIN] SEEKER ${data.userId} unauthorized for chat ${data.chatId}`,
        );
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
          this.logger.warn(
            `[JOIN] EMPLOYEE ${data.userId} unauthorized for chat ${data.chatId}`,
          );
          client.emit('error', {
            message: 'Bạn không có quyền truy cập chat này',
          });
          return;
        }
      }

      this.connectedUsers.set(client.id, data.userId);
      void client.join(`chat:${data.chatId}`);
      this.logger.log(
        `✅ [JOIN] User ${data.userId} joined chat ${data.chatId} (socket: ${client.id})`,
      );
    } catch (error) {
      this.logger.error('Error in handleJoin:', error);
      client.emit('error', { message: 'Lỗi trong quá trình tham gia chat' });
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeave(client: AuthenticatedSocket, data: { chatId: number }) {
    try {
      if (!data.chatId) {
        return;
      }
      void client.leave(`chat:${data.chatId}`);
      this.logger.log(
        `👋 [LEAVE] User ${client.userId} left chat ${data.chatId}`,
      );
    } catch (error) {
      this.logger.error('Error in handleLeave:', error);
    }
  }

  @SubscribeMessage('message:send')
  async handleSend(client: AuthenticatedSocket, payload: IMessagePayload) {
    try {
      // Verify user is authenticated
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

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
      this.logger.log(
        `📤 [BROADCAST] Message ${msg.message_id} to chat:${payload.chat_id}`,
      );
      if (this.server) {
        this.server.to(`chat:${payload.chat_id}`).emit('message:new', msg);
      }
    } catch (error) {
      this.logger.error('Error in handleSend:', error);
      client.emit('error', { message: 'Lỗi trong quá trình gửi tin nhắn' });
    }
  }

  /**
   * Broadcast message created via REST API to WebSocket clients
   */
  broadcastMessage(message: any) {
    this.logger.log(
      `📤 [BROADCAST] REST API message ${message.message_id} to chat:${message.chat_id}`,
    );
    if (this.server) {
      this.server.to(`chat:${message.chat_id}`).emit('message:new', message);
    }
  }
}

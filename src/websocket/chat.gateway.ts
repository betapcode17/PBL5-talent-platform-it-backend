import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  OnGatewayConnection,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WebSocketGuard } from './websocket.guard.js';
import { MessageService } from '../message/message.service.js';
import { ChatService } from '../chat/chat.service.js';
import { JwtService } from '@nestjs/jwt';

interface UserPayload {
  sub: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
  email: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/',
})
@UseGuards(WebSocketGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server | undefined;

  private connectedUsers: Map<
    string,
    { userId: number; socketId: string; role: string }
  > = new Map();

  constructor(
    private readonly messageService: MessageService,
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    try {
      console.log(`Client connected: ${client.id}`);

      // Lấy user info từ token
      const token = client.handshake.auth.token as string;
      if (!token) {
        console.warn('No token provided');
        client.disconnect();
        return;
      }

      const user: UserPayload = this.jwtService.verify(token);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      client.data.user = user;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      client.data.userId = user.sub;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      client.data.role = user.role;

      this.connectedUsers.set(client.id, {
        userId: user.sub,
        socketId: client.id,
        role: user.role,
      });

      console.log(
        ` User ${user.sub} (${user.role}) connected with socket ${client.id}`,
      );
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('chat:join')
  handleJoinChat(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = `chat:${data.chatId}`;
      void client.join(room);
      console.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ` Client ${client.id} (User ${client.data.userId}) joined room: ${room}`,
      );

      // Notify others in room
      client.to(room).emit('chat:user-joined', {
        socketId: client.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        userId: client.data.userId,
        timestamp: new Date().toISOString(),
      });

      return { status: 'ok', message: 'Joined chat room' };
    } catch (error) {
      console.error('Join chat error:', error);
      return { status: 'error', message: 'Failed to join chat' };
    }
  }

  @SubscribeMessage('chat:leave')
  handleLeaveChat(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = `chat:${data.chatId}`;
      client.leave(room);
      console.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Client ${client.id} (User ${client.data.userId}) left room: ${room}`,
      );

      client.to(room).emit('chat:user-left', {
        socketId: client.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        userId: client.data.userId,
        timestamp: new Date().toISOString(),
      });

      return { status: 'ok', message: 'Left chat room' };
    } catch (error) {
      console.error('Leave chat error:', error);
      return { status: 'error', message: 'Failed to leave chat' };
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @MessageBody() data: { chatId: number; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { chatId, content } = data;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const userId = client.data.userId;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const role = client.data.role;

      if (!chatId || !content?.trim()) {
        return { status: 'error', message: 'Invalid message data' };
      }

      // Lưu message vào database
      const message = await this.messageService.sendMessage(
        chatId,
        content,
        role === 'SEEKER' ? 'SEEKER' : 'EMPLOYEE',
        userId,
      );

      console.log(` Message ${message.message_id} sent to chat ${chatId}`);

      // Broadcast cho tất cả người trong room
      const room = `chat:${chatId}`;
      if (this.server) {
        this.server.to(room).emit('message:new', message);
      }

      return message;
    } catch (error) {
      console.error('Send message error:', error);
      return { status: 'error', message: 'Failed to send message' };
    }
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @MessageBody() data: { chatId: number; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = `chat:${data.chatId}`;
      client.to(room).emit('chat:typing', {
        chatId: data.chatId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        userId: client.data.userId,
        typing: data.isTyping,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Typing error:', error);
    }
  }

  @SubscribeMessage('message:read')
  handleMarkAsRead(
    @MessageBody() data: { messageId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // TODO: Update message read status in database
      console.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ` Message ${data.messageId} marked as read by user ${client.data.userId}`,
      );

      return { status: 'ok', message: 'Marked as read' };
    } catch (error) {
      console.error('Mark as read error:', error);
      return { status: 'error', message: 'Failed to mark as read' };
    }
  }

  // Helper method để broadcast message tới toàn bộ users của một chat
  broadcastToChat(chatId: number, eventName: string, data: any) {
    if (!this.server) return;
    const room = `chat:${chatId}`;
    this.server.to(room).emit(eventName, data);
  }

  // Helper method để get all connected users trong chat room
  getConnectedUsersInChat(chatId: number) {
    if (!this.server) return [];
    const room = `chat:${chatId}`;
    const sockets = this.server.sockets.adapter.rooms.get(room);
    return sockets
      ? Array.from(sockets).map((id) => this.connectedUsers.get(id))
      : [];
  }
}

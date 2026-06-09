import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { NotificationRole } from '../generated/prisma/client.js';
import { WebSocketGuard } from '../websocket/websocket.guard.js';
import { JoinNotificationRoomDto } from './dto/join-notification-room.dto.js';
import { NotificationEvent } from './enums/notification-event.enum.js';
import { NotificationsRealtimeService } from './notifications.realtime.service.js';
import { NotificationsService } from './notifications.service.js';

type SocketUser = {
  sub: number;
  role: NotificationRole;
  email: string;
};

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
})
@UseGuards(WebSocketGuard)
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server | undefined;

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtime: NotificationsRealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attachServer(server);
  }

  handleConnection(client: Socket) {
    const user = WebSocketGuard.validateToken(client, this.jwtService) as SocketUser;
    client.data.user = user;
    client.data.userId = user.sub;
    client.data.role = user.role;
    void client.join(this.realtime.getUserRoom(user.sub));
    void client.join(this.realtime.getRoleRoom(user.role));
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('notifications:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JoinNotificationRoomDto,
  ) {
    const role = (body.role ?? client.data.role) as NotificationRole;
    void client.join(this.realtime.getUserRoom(client.data.userId as number));
    void client.join(this.realtime.getRoleRoom(role));

    return {
      event: NotificationEvent.JOINED,
      userId: client.data.userId,
      role,
    };
  }

  @SubscribeMessage('notifications:mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { notificationId: number },
  ) {
    return this.notificationsService.markAsRead(
      {
        sub: client.data.userId as number,
        role: client.data.role as NotificationRole,
        email: '',
      },
      body.notificationId,
    );
  }
}

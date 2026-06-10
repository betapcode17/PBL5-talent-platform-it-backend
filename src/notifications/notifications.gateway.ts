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

type NotificationSocket = Socket & {
  data: {
    user?: SocketUser;
    userId?: number;
    role?: NotificationRole;
  };
};

type NotificationSocketData = NotificationSocket['data'];

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

  handleConnection(client: NotificationSocket) {
    let user: SocketUser;

    try {
      user = WebSocketGuard.validateToken(
        client,
        this.jwtService,
      ) as SocketUser;
    } catch {
      client.disconnect(true);
      return;
    }

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const socketData = client.data as unknown as NotificationSocketData;
    socketData.user = user;
    socketData.userId = user.sub;
    socketData.role = user.role;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    void client.join(this.realtime.getUserRoom(user.sub));
    void client.join(this.realtime.getRoleRoom(user.role));
  }

  handleDisconnect(client: NotificationSocket) {
    void client;
  }

  @SubscribeMessage('notifications:join')
  handleJoin(
    @ConnectedSocket() client: NotificationSocket,
    @MessageBody() body: JoinNotificationRoomDto,
  ) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const socketData = client.data as unknown as NotificationSocketData;
    const role = (body.role ?? socketData.role) as NotificationRole;
    const userId = socketData.userId;
    void client.join(this.realtime.getUserRoom(socketData.userId as number));
    void client.join(this.realtime.getRoleRoom(role));
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    return {
      event: NotificationEvent.JOINED,
      userId,
      role,
    };
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  }

  @SubscribeMessage('notifications:mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: NotificationSocket,
    @MessageBody() body: { notificationId: number },
  ) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const socketData = client.data as unknown as NotificationSocketData;

    return this.notificationsService.markAsRead(
      {
        sub: socketData.userId as number,
        role: socketData.role as NotificationRole,
        email: '',
      },
      body.notificationId,
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  }
}

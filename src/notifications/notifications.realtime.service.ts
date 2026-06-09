import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { NotificationRole } from '../generated/prisma/client.js';
import { NotificationEvent } from './enums/notification-event.enum.js';

@Injectable()
export class NotificationsRealtimeService {
  private server: Server | null = null;

  attachServer(server: Server) {
    this.server = server;
  }

  getUserRoom(userId: number) {
    return `notifications:user:${userId}`;
  }

  getRoleRoom(role: NotificationRole) {
    return `notifications:role:${role}`;
  }

  emitToUser(userId: number, event: NotificationEvent, payload: unknown) {
    this.server?.to(this.getUserRoom(userId)).emit(event, payload);
  }

  emitToRole(role: NotificationRole, event: NotificationEvent, payload: unknown) {
    this.server?.to(this.getRoleRoom(role)).emit(event, payload);
  }
}

import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Notification,
  NotificationRole,
  NotificationType,
  Prisma,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { GetNotificationsQueryDto } from './dto/get-notifications.query.dto.js';
import { NotificationEvent } from './enums/notification-event.enum.js';
import { NotificationsRealtimeService } from './notifications.realtime.service.js';

type RequestUser = {
  sub: number;
  role: NotificationRole;
  email?: string;
};

type CreateNotificationInput = {
  title: string;
  message: string;
  type: NotificationType;
  role: NotificationRole;
  receiverId: number;
  senderId?: number | null;
  dedupeKey?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: NotificationsRealtimeService,
  ) {}

  async createNotification(input: CreateNotificationInput) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          title: input.title,
          message: input.message,
          type: input.type,
          role: input.role,
          receiver_id: input.receiverId,
          sender_id: input.senderId ?? null,
          dedupe_key: input.dedupeKey ?? null,
          metadata: input.metadata,
        },
      });

      const payload = this.mapNotification(notification);
      const unreadCount = await this.prisma.notification.count({
        where: {
          receiver_id: input.receiverId,
          is_read: false,
        },
      });

      this.realtime.emitToUser(input.receiverId, NotificationEvent.NEW, payload);
      this.realtime.emitToUser(input.receiverId, NotificationEvent.UNREAD_COUNT, {
        unreadCount,
      });

      return payload;
    } catch (error) {
      if (this.isNotificationTableMissing(error)) {
        this.logger.warn(
          `Skip createNotification because Notification table is missing. receiverId=${input.receiverId}, type=${input.type}`,
        );

        return this.buildFallbackNotification(input);
      }

      throw error;
    }
  }

  async notifyUsers(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) {
      return [];
    }

    const notifications = await Promise.all(
      inputs.map((input) => this.createNotification(input)),
    );

    return notifications;
  }

  async createNotificationIfNotExists(
    input: CreateNotificationInput,
    lookbackHours = 24,
  ) {
    if (!input.dedupeKey) {
      return this.createNotification(input);
    }

    try {
      const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
      const existing = await this.prisma.notification.findFirst({
        where: {
          receiver_id: input.receiverId,
          type: input.type,
          dedupe_key: input.dedupeKey,
          created_date: {
            gte: since,
          },
        },
        orderBy: {
          created_date: 'desc',
        },
      });

      if (existing) {
        return this.mapNotification(existing);
      }

      return this.createNotification(input);
    } catch (error) {
      if (this.isNotificationTableMissing(error)) {
        this.logger.warn(
          `Skip createNotificationIfNotExists because Notification table is missing. receiverId=${input.receiverId}, type=${input.type}`,
        );

        return this.buildFallbackNotification(input);
      }

      throw error;
    }
  }

  async notifyRole(
    role: NotificationRole,
    payload: Omit<CreateNotificationInput, 'receiverId' | 'role'>,
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        role,
        is_active: true,
      },
      select: {
        user_id: true,
      },
    });

    return this.notifyUsers(
      users.map((user) => ({
        ...payload,
        role,
        receiverId: user.user_id,
      })),
    );
  }

  async getNotifications(user: RequestUser, query: GetNotificationsQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      receiver_id: user.sub,
      ...(query.type ? { type: query.type } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(typeof query.isRead === 'boolean' ? { is_read: query.isRead } : {}),
    };

    try {
      const [items, total] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          orderBy: { created_date: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.notification.count({ where }),
      ]);

      return {
        items: items.map((item) => this.mapNotification(item)),
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      };
    } catch (error) {
      if (this.isNotificationTableMissing(error)) {
        this.logger.warn(
          `Return empty notifications because Notification table is missing. receiverId=${user.sub}`,
        );

        return {
          items: [],
          total: 0,
          page: query.page,
          limit: query.limit,
          totalPages: 0,
        };
      }

      throw error;
    }
  }

  async getUnreadCount(user: RequestUser) {
    try {
      const unreadCount = await this.prisma.notification.count({
        where: {
          receiver_id: user.sub,
          is_read: false,
        },
      });

      return { unreadCount };
    } catch (error) {
      if (this.isNotificationTableMissing(error)) {
        this.logger.warn(
          `Return unreadCount=0 because Notification table is missing. receiverId=${user.sub}`,
        );

        return { unreadCount: 0 };
      }

      throw error;
    }
  }

  async markAsRead(user: RequestUser, notificationId: number) {
    const notification = await this.ensureOwnership(notificationId, user.sub);

    const updated = notification.is_read
      ? notification
      : await this.prisma.notification.update({
          where: { notification_id: notificationId },
          data: {
            is_read: true,
            read_at: new Date(),
          },
        });

    const payload = this.mapNotification(updated);
    const unreadCount = await this.prisma.notification.count({
      where: {
        receiver_id: user.sub,
        is_read: false,
      },
    });

    this.realtime.emitToUser(user.sub, NotificationEvent.READ, payload);
    this.realtime.emitToUser(user.sub, NotificationEvent.UNREAD_COUNT, {
      unreadCount,
    });

    return payload;
  }

  async markAllAsRead(user: RequestUser) {
    await this.prisma.notification.updateMany({
      where: {
        receiver_id: user.sub,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    this.realtime.emitToUser(user.sub, NotificationEvent.ALL_READ, {
      success: true,
    });
    this.realtime.emitToUser(user.sub, NotificationEvent.UNREAD_COUNT, {
      unreadCount: 0,
    });

    return { success: true };
  }

  async remove(user: RequestUser, notificationId: number) {
    await this.ensureOwnership(notificationId, user.sub);

    await this.prisma.notification.delete({
      where: { notification_id: notificationId },
    });

    const unreadCount = await this.prisma.notification.count({
      where: {
        receiver_id: user.sub,
        is_read: false,
      },
    });

    this.realtime.emitToUser(user.sub, NotificationEvent.DELETED, {
      notificationId,
    });
    this.realtime.emitToUser(user.sub, NotificationEvent.UNREAD_COUNT, {
      unreadCount,
    });

    return { success: true };
  }

  private async ensureOwnership(notificationId: number, receiverId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { notification_id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.receiver_id !== receiverId) {
      throw new ForbiddenException('Ban khong co quyen thao tac notification nay');
    }

    return notification;
  }

  private mapNotification(notification: Notification) {
    return {
      id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      role: notification.role,
      receiverId: notification.receiver_id,
      senderId: notification.sender_id,
      dedupeKey: notification.dedupe_key,
      isRead: notification.is_read,
      readAt: notification.read_at,
      metadata: notification.metadata,
      createdAt: notification.created_date,
      updatedAt: notification.updated_date,
    };
  }

  private buildFallbackNotification(input: CreateNotificationInput) {
    const now = new Date();

    return {
      id: 0,
      title: input.title,
      message: input.message,
      type: input.type,
      role: input.role,
      receiverId: input.receiverId,
      senderId: input.senderId ?? null,
      dedupeKey: input.dedupeKey ?? null,
      isRead: false,
      readAt: null,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  private isNotificationTableMissing(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2021'
    );
  }
}

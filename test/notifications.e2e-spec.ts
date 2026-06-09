import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  io,
  type Socket,
} from '../../frontend/node_modules/socket.io-client/build/esm/index.js';
import request from 'supertest';
import { JwtAuthGuard } from '../src/jwt/jwt-auth.guard.js';
import { NotificationsController } from '../src/notifications/notifications.controller.js';
import { NotificationsGateway } from '../src/notifications/notifications.gateway.js';
import { NotificationsRealtimeService } from '../src/notifications/notifications.realtime.service.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';
import { PrismaService } from '../src/prisma.service.js';
import { WebSocketGuard } from '../src/websocket/websocket.guard.js';

type NotificationRecord = {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  role: 'ADMIN' | 'SEEKER' | 'EMPLOYEE';
  receiver_id: number;
  sender_id: number | null;
  dedupe_key: string | null;
  is_read: boolean;
  read_at: Date | null;
  metadata: Record<string, unknown> | null;
  created_date: Date;
  updated_date: Date;
};

class PrismaServiceMock {
  private notifications: NotificationRecord[] = [];
  private sequence = 1;

  notification = {
    create: async (_args: any) => undefined as unknown as NotificationRecord,
  };

  user = {
    findMany: async () => [],
  };

  constructor() {
    this.notification.create = async ({ data }: any) => {
      const now = new Date();
      const record: NotificationRecord = {
        notification_id: this.sequence++,
        title: data.title,
        message: data.message,
        type: data.type,
        role: data.role,
        receiver_id: data.receiver_id,
        sender_id: data.sender_id ?? null,
        dedupe_key: data.dedupe_key ?? null,
        is_read: false,
        read_at: null,
        metadata: (data.metadata as Record<string, unknown> | null) ?? null,
        created_date: now,
        updated_date: now,
      };

      this.notifications.push(record);
      return record;
    };
  }

  notificationCount = async ({ where }: any = {}) => {
    return this.notifications.filter((item) => this.matches(item, where))
      .length;
  };

  notificationFindMany = async ({
    where,
    orderBy,
    skip = 0,
    take = 10,
  }: any) => {
    const filtered = this.notifications
      .filter((item) => this.matches(item, where))
      .sort((a, b) =>
        orderBy?.created_date === 'desc'
          ? b.created_date.getTime() - a.created_date.getTime()
          : a.created_date.getTime() - b.created_date.getTime(),
      );

    return filtered.slice(skip, skip + take);
  };

  notificationFindFirst = async ({ where, orderBy }: any) => {
    const filtered = this.notifications
      .filter((item) => this.matches(item, where))
      .sort((a, b) =>
        orderBy?.created_date === 'desc'
          ? b.created_date.getTime() - a.created_date.getTime()
          : a.created_date.getTime() - b.created_date.getTime(),
      );
    return filtered[0] ?? null;
  };

  notificationFindUnique = async ({ where }: any) => {
    return (
      this.notifications.find(
        (item) => item.notification_id === where.notification_id,
      ) ?? null
    );
  };

  notificationUpdate = async ({ where, data }: any) => {
    const notification = this.notifications.find(
      (item) => item.notification_id === where.notification_id,
    );
    if (!notification) throw new Error('Notification not found');
    Object.assign(notification, data, { updated_date: new Date() });
    return notification;
  };

  notificationUpdateMany = async ({ where, data }: any) => {
    const targets = this.notifications.filter((item) =>
      this.matches(item, where),
    );
    targets.forEach((item) =>
      Object.assign(item, data, { updated_date: new Date() }),
    );
    return { count: targets.length };
  };

  notificationDelete = async ({ where }: any) => {
    const index = this.notifications.findIndex(
      (item) => item.notification_id === where.notification_id,
    );
    if (index >= 0) this.notifications.splice(index, 1);
    return { success: true };
  };

  reset() {
    this.notifications = [];
    this.sequence = 1;
  }

  seed(
    record: Partial<NotificationRecord> &
      Pick<
        NotificationRecord,
        'receiver_id' | 'role' | 'title' | 'message' | 'type'
      >,
  ) {
    const now = new Date();
    const next: NotificationRecord = {
      notification_id: this.sequence++,
      sender_id: null,
      dedupe_key: null,
      is_read: false,
      read_at: null,
      metadata: null,
      created_date: now,
      updated_date: now,
      ...record,
    };
    this.notifications.push(next);
    return next;
  }

  bind() {
    (this as any).notification = {
      create: this.notification.create,
      count: this.notificationCount,
      findMany: this.notificationFindMany,
      findFirst: this.notificationFindFirst,
      findUnique: this.notificationFindUnique,
      update: this.notificationUpdate,
      updateMany: this.notificationUpdateMany,
      delete: this.notificationDelete,
    };
    return this;
  }

  private matches(item: NotificationRecord, where: any) {
    if (!where) return true;

    const entries = Object.entries(where);
    return entries.every(([key, value]) => {
      if (
        key === 'created_date' &&
        value &&
        typeof value === 'object' &&
        'gte' in (value as any)
      ) {
        return item.created_date >= (value as any).gte;
      }

      return (item as any)[key] === value;
    });
  }
}

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let notificationsService: NotificationsService;
  let prisma: PrismaServiceMock;
  let socket: Socket;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.ACCESS_TOKEN_SECRET = 'test-secret';
    prisma = new PrismaServiceMock().bind();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          global: true,
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [NotificationsController],
      providers: [
        NotificationsRealtimeService,
        NotificationsService,
        NotificationsGateway,
        WebSocketGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate() {
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { sub: 1, role: 'SEEKER', email: 'seeker@test.com' };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    await app.listen(0);

    jwtService = app.get(JwtService);
    notificationsService = app.get(NotificationsService);

    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    prisma.reset();
  });

  afterEach(() => {
    if (socket?.connected) {
      socket.disconnect();
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('supports list -> mark read -> mark all -> delete via REST API', async () => {
    const first = prisma.seed({
      title: 'Ứng tuyển thành công',
      message: 'Bạn đã ứng tuyển thành công.',
      type: 'APPLICATION_SUBMITTED',
      role: 'SEEKER',
      receiver_id: 1,
      sender_id: 2,
      metadata: { jobId: 10 },
    });
    const second = prisma.seed({
      title: 'Công ty phản hồi',
      message: 'Nhà tuyển dụng đã gửi phản hồi mới.',
      type: 'COMPANY_REPLIED',
      role: 'SEEKER',
      receiver_id: 1,
      sender_id: 2,
      metadata: { chatId: 88 },
    });

    const listResponse = await request(app.getHttpServer())
      .get('/notifications')
      .expect(200);

    expect(listResponse.body.items).toHaveLength(2);
    expect(listResponse.body.total).toBe(2);
    expect(
      listResponse.body.items
        .map((item: any) => item.id)
        .sort((a: number, b: number) => a - b),
    ).toEqual([first.notification_id, second.notification_id]);

    await request(app.getHttpServer())
      .patch(`/notifications/${first.notification_id}/read`)
      .expect(200);

    const unreadResponse = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .expect(200);

    expect(unreadResponse.body.unreadCount).toBe(1);

    await request(app.getHttpServer())
      .patch('/notifications/read-all')
      .expect(200);

    const unreadAfterReadAllResponse = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .expect(200);

    expect(unreadAfterReadAllResponse.body.unreadCount).toBe(0);

    await request(app.getHttpServer())
      .delete(`/notifications/${second.notification_id}`)
      .expect(200);

    const finalListResponse = await request(app.getHttpServer())
      .get('/notifications')
      .expect(200);

    expect(finalListResponse.body.items).toHaveLength(1);
    expect(finalListResponse.body.items[0].id).toBe(first.notification_id);

    const filteredListResponse = await request(app.getHttpServer())
      .get('/notifications')
      .query({ type: 'COMPANY_REPLIED' })
      .expect(200);

    expect(filteredListResponse.body.items).toHaveLength(0);
  });

  it('supports websocket mark-read flow and unread count updates', async () => {
    const seeded = prisma.seed({
      title: 'CV đã được xem',
      message: 'Nhà tuyển dụng vừa xem CV của bạn.',
      type: 'CV_VIEWED',
      role: 'SEEKER',
      receiver_id: 1,
      sender_id: 2,
      metadata: { jobId: 77 },
    });

    const token = await jwtService.signAsync({
      sub: 1,
      role: 'SEEKER',
      email: 'seeker@test.com',
    });

    const connected = new Promise<void>((resolve, reject) => {
      socket = io(`${baseUrl}/notifications`, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => resolve());
      socket.on('connect_error', (error) => reject(error));
    });

    await connected;

    const readEventPromise = new Promise<any>((resolve, reject) => {
      socket.on('notification:read', (payload) => resolve(payload));
      socket.on('connect_error', (error) => reject(error));
    });

    const unreadCountEventPromise = new Promise<any>((resolve, reject) => {
      socket.on('notification:unread-count', (payload) => {
        if (payload?.unreadCount === 0) {
          resolve(payload);
        }
      });
      socket.on('connect_error', (error) => reject(error));
    });

    socket.emit('notifications:mark-read', {
      notificationId: seeded.notification_id,
    });

    const readPayload = await readEventPromise;
    const unreadPayload = await unreadCountEventPromise;

    expect(readPayload.id).toBe(seeded.notification_id);
    expect(readPayload.isRead).toBe(true);
    expect(unreadPayload.unreadCount).toBe(0);

    const unreadResponse = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .expect(200);

    expect(unreadResponse.body.unreadCount).toBe(0);
  });

  it('pushes realtime notification:new events over websocket', async () => {
    const token = await jwtService.signAsync({
      sub: 1,
      role: 'SEEKER',
      email: 'seeker@test.com',
    });

    const connected = new Promise<void>((resolve, reject) => {
      socket = io(`${baseUrl}/notifications`, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => resolve());
      socket.on('connect_error', (error) => reject(error));
    });

    await connected;

    const incoming = new Promise<any>((resolve, reject) => {
      socket.on('notification:new', (payload) => resolve(payload));
      socket.on('connect_error', (error) => reject(error));
    });

    await notificationsService.createNotification({
      title: 'Công ty đã phản hồi',
      message: 'Mời bạn kiểm tra tin nhắn mới.',
      type: 'COMPANY_REPLIED',
      role: 'SEEKER',
      receiverId: 1,
      senderId: 2,
      metadata: { chatId: 99 },
    });

    const payload = await incoming;
    expect(payload.title).toBe('Công ty đã phản hồi');
    expect(payload.type).toBe('COMPANY_REPLIED');
    expect(payload.receiverId).toBe(1);
  }, 15000);
});

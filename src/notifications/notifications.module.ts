import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { WebSocketGuard } from '../websocket/websocket.guard.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { NotificationsRealtimeService } from './notifications.realtime.service.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('ACCESS_TOKEN_SECRET') ||
          'default-secret-key-change-in-production',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsRealtimeService,
    NotificationsService,
    WebSocketGuard,
    NotificationsGateway,
  ],
  exports: [NotificationsService, NotificationsRealtimeService],
})
export class NotificationsModule {}

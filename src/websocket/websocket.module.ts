import { Module } from '@nestjs/common';
import { MessageModule } from '../message/message.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MessageModule,
    ChatModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [MessageModule, ChatModule],
})
export class WebSocketModule {}

import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGuard } from './websocket.guard.js';

export type SocketIOMiddleware = {
  (client: Socket, next: (err?: Error) => void);
};

export const SocketAuthMiddleware = (
  jwtService: JwtService,
  configService: ConfigService,
): SocketIOMiddleware => {
  return (client, next) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      WebSocketGuard.validateToken(client, jwtService, configService);
      next();
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      next(error);
    }
  };
};

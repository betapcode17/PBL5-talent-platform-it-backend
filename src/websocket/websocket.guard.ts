import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WebSocketGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (context.getType() !== 'ws') {
      return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const client: Socket = context.switchToWs().getClient();
    WebSocketGuard.validateToken(client, this.jwtService, this.configService);
    return true;
  }
  static validateToken(
    client: Socket,
    jwtService: JwtService,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _configService: ConfigService,
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { authorization } = client.handshake.headers;

      if (!authorization) {
        throw new UnauthorizedException('Authorization header missing');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const token: string = authorization.split(' ')[1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = jwtService.verify(token);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return payload;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}

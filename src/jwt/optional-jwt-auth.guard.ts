import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (!token) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: unknown, user: TUser) {
    if (err) {
      return null;
    }

    return user ?? null;
  }
}

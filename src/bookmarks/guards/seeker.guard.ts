import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SeekerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;

    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }

    if (user.role !== 'SEEKER') {
      throw new ForbiddenException('Seeker only');
    }

    return true;
  }
}

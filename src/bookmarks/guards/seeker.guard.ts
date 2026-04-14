import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SeekerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class EmployeeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;

    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }

    if (user.role !== 'EMPLOYEE') {
      throw new ForbiddenException('Employee only');
    }

    return true;
  }
}

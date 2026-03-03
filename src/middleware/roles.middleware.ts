import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface UserWithRole {
  role: string;
  [key: string]: any;
}
@Injectable()
export class RolesMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user as UserWithRole;
    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin only');
    }
    next();
  }
}

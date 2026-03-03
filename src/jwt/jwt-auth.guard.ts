import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma.service.js';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: any): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const request = context.switchToHttp().getRequest();

    // 1 Lấy access token từ header
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    // 2️ Kiểm tra token có tồn tại trong DB không
    const tokenRecord = await this.prisma.token.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Token đã bị thu hồi');
    }

    // 3️ Cho passport xử lý tiếp (verify JWT)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return super.canActivate(context) as boolean;
  }
}

@Injectable()
export class EmployeeChatGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const req = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user = req.user;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.role !== 'EMPLOYEE') return true;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const chatId = Number(req.body.chatId || req.params.chatId);

    const chat = await this.prisma.chat.findUnique({
      where: { chat_id: chatId },
    });

    if (!chat) return false;

    const employee = await this.prisma.employee.findUnique({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      where: { employee_id: user.userId },
    });

    return employee?.company_id === chat.company_id;
  }
}

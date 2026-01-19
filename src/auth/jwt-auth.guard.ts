import { Injectable, UnauthorizedException } from '@nestjs/common';
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

import { Module } from '@nestjs/common';
import { FollowService } from './follow.service.js';
import { FollowController } from './follow.controller.js';
import { PrismaService } from '../prisma.service.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';

@Module({
  controllers: [FollowController],
  providers: [FollowService, PrismaService, JwtAuthGuard],
  exports: [FollowService],
})
export class FollowModule {}

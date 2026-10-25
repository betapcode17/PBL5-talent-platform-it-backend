import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { PrismaService } from '../prisma.service.js';
import { CloudinaryService } from '../upload/cloudinary.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, CloudinaryService],
})
export class UsersModule {}


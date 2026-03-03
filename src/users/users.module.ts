import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { PrismaService } from '../prisma.service.js';
import { RolesMiddleware } from '../middleware/roles.middleware.js';
import { CloudinaryService } from '../upload/cloudinary.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, CloudinaryService],
})
export class UsersModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RolesMiddleware).forRoutes(
      // // ADMIN APIs
      // { path: 'users', method: RequestMethod.GET },
      { path: 'users/:id/activate', method: RequestMethod.PATCH },
      { path: 'users/:id/deactivate', method: RequestMethod.PATCH },
    );
  }
}

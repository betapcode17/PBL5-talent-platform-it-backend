import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { ChatModule } from './chat/chat.module.js';
import { MessageModule } from './message/message.module.js';
import { CompanyModule } from './company/company.module.js';
import { FollowModule } from './follow/follow.module.js';
import { WebSocketModule } from './websocket/websocket.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { JobTypesModule } from './job-types/job-types.module.js';
import { BookmarksModule } from './bookmarks/bookmarks.module.js';

import { InterviewsModule } from './interviews/interviews.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    PrismaModule,
    EmployeesModule,
    ChatModule,
    MessageModule,
    CompanyModule,
    FollowModule,
    WebSocketModule,
    JobsModule,
    JobTypesModule,
    BookmarksModule,
    ApplicationsModule,
    InterviewsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

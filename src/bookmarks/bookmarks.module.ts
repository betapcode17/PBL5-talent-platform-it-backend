import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { BookmarksController } from './bookmarks.controller.js';
import { BookmarksService } from './bookmarks.service.js';
import { SeekerGuard } from './guards/seeker.guard.js';

@Module({
  imports: [NotificationsModule],
  controllers: [BookmarksController],
  providers: [BookmarksService, SeekerGuard],
})
export class BookmarksModule {}

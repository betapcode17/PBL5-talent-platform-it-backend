import { Module } from '@nestjs/common';
import { BookmarksController } from './bookmarks.controller.js';
import { BookmarksService } from './bookmarks.service.js';
import { SeekerGuard } from './guards/seeker.guard.js';

@Module({
  controllers: [BookmarksController],
  providers: [BookmarksService, SeekerGuard],
})
export class BookmarksModule {}

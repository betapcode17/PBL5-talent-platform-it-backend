import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReqUser } from '../common/decorators/req-user.decorator.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { BookmarksService } from './bookmarks.service.js';
import { CreateBookmarkDto } from './dto/create-bookmark.dto.js';
import { ListBookmarksQueryDto } from './dto/list-bookmarks.query.dto.js';
import { SeekerGuard } from './guards/seeker.guard.js';

type RequestUser = {
  sub: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
};

@ApiTags('bookmarks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SeekerGuard)
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @ApiOperation({ summary: 'Them bookmark job (SEEKER)' })
  @ApiBody({ type: CreateBookmarkDto })
  @Post()
  create(@ReqUser() user: RequestUser, @Body() dto: CreateBookmarkDto) {
    return this.bookmarksService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Lay danh sach bookmarks cua seeker' })
  @ApiQuery({ name: 'jobId', required: false, example: 1 })
  @Get()
  findAll(@ReqUser() user: RequestUser, @Query() query: ListBookmarksQueryDto) {
    return this.bookmarksService.findAll(user.sub, query.jobId);
  }

  @ApiOperation({ summary: 'Xoa bookmark (SEEKER)' })
  @Delete(':id')
  remove(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookmarksService.remove(user.sub, id);
  }
}

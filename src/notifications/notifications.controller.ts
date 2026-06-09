import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReqUser } from '../common/decorators/req-user.decorator.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { GetNotificationsQueryDto } from './dto/get-notifications.query.dto.js';
import { NotificationsService } from './notifications.service.js';

type RequestUser = {
  sub: number;
  role: 'ADMIN' | 'SEEKER' | 'EMPLOYEE';
  email: string;
};

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Lay danh sach notifications cua user hien tai' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'isRead', required: false })
  @Get()
  getNotifications(
    @ReqUser() user: RequestUser,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.getNotifications(user, query);
  }

  @ApiOperation({ summary: 'Lay so thong bao chua doc' })
  @Get('unread-count')
  getUnreadCount(@ReqUser() user: RequestUser) {
    return this.notificationsService.getUnreadCount(user);
  }

  @ApiOperation({ summary: 'Danh dau 1 thong bao da doc' })
  @ApiParam({ name: 'id', example: 1 })
  @Patch(':id/read')
  markAsRead(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(user, id);
  }

  @ApiOperation({ summary: 'Danh dau tat ca thong bao da doc' })
  @Patch('read-all')
  markAllAsRead(@ReqUser() user: RequestUser) {
    return this.notificationsService.markAllAsRead(user);
  }

  @ApiOperation({ summary: 'Xoa 1 thong bao' })
  @ApiParam({ name: 'id', example: 1 })
  @Delete(':id')
  remove(@ReqUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.remove(user, id);
  }
}

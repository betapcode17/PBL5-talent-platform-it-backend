import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { ChatService } from './chat.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { ReqUser } from '../common/decorators/req-user.decorator.js';

interface IUserPayload {
  sub: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  async create(@ReqUser() user: IUserPayload, @Body() dto: CreateChatDto) {
    if (user.role === 'SEEKER') {
      dto.seeker_id = user.sub;
    } else if (user.role !== 'EMPLOYEE') {
      throw new BadRequestException(
        'Chỉ seeker hoặc employee mới có thể tạo chat',
      );
    }
    return this.chatService.CreateChat(dto);
  }
  @Get('me')
  async getMyChat(@ReqUser() user: IUserPayload) {
    if (user.role === 'SEEKER') {
      return this.chatService.getAllChatOfSeeker(user.sub);
    } else if (user.role === 'EMPLOYEE') {
      const companyId = await this.chatService.getCompanyIdByEmployeeId(
        user.sub,
      );
      return this.chatService.getAllChatOfCompany(companyId);
    }
    return [];
  }

  @Get('company/:id')
  async getCompanyChat(
    @ReqUser() user: IUserPayload,
    @Param('id', ParseIntPipe) companyId: number,
  ) {
    if (user.role === 'ADMIN') {
      return this.chatService.getAllChatOfCompany(companyId);
    }
    if (user.role === 'EMPLOYEE') {
      const userCompanyId = await this.chatService.getCompanyIdByEmployeeId(
        user.sub,
      );
      if (userCompanyId !== companyId) {
        throw new ForbiddenException('Bạn không thuộc công ty này');
      }
      return this.chatService.getAllChatOfCompany(companyId);
    }
    throw new ForbiddenException(
      'Chỉ nhân viên công ty hoặc ADMIN mới có quyền truy cập',
    );
  }
  @Get(':id')
  async getChatDetail(
    @ReqUser() user: IUserPayload,
    @Param('id', ParseIntPipe) chatId: number,
  ) {
    return this.chatService.getChatDetail(chatId, user.sub, user.role);
  }
}

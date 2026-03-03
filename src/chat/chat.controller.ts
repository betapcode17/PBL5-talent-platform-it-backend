import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { ChatService } from './chat.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { ReqUser } from '../common/decorators/req-user.decorator.js';

interface IUserPayload {
  user_id: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
  seeker_id?: number;
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
      if (!user.seeker_id) {
        throw new BadRequestException('Seeker ID không tồn tại');
      }
      dto.seeker_id = user.seeker_id;
    } else if (user.role !== 'EMPLOYEE') {
      throw new BadRequestException(
        'Chỉ seeker hoặc employee mới có thể tạo chat',
      );
    }
    return this.chatService.CreateChat(dto);
  }

  @Get(':id')
  async getChatDetail(
    @ReqUser() user: IUserPayload,
    @Param('id', ParseIntPipe) chatId: number,
  ) {
    return this.chatService.getChatDetail(chatId, user.user_id, user.role);
  }

  @Get('me')
  async getMyChat(@ReqUser() user: IUserPayload) {
    if (user.role !== 'SEEKER') {
      return [];
    }
    if (!user.seeker_id) {
      throw new BadRequestException('Seeker ID không tồn tại');
    }
    return this.chatService.getAllChatOfSeeker(user.seeker_id);
  }
}

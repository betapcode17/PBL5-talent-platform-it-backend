import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard.js';
import { ChatService } from './chat.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { ReqUser } from 'src/common/decorators/req-user.decorator.js';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  create(@ReqUser() user, @Body() dto: CreateChatDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.role === 'SEEKER') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      dto.seeker_id = user.seeker_id;
    }
    return this.chatService.CreateChat(dto);
  }

  @Get(':id')
  getChatDetail(@ReqUser() user, @Param('id', ParseIntPipe) chatId: number) {
    return this.chatService.getChatDetail(chatId);
  }
  @Get('me')
  getMyChat(@ReqUser() user) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.role !== 'SEEKER') {
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.chatService.getAllChatOfSeeker(+user.seeker_id);
  }
}

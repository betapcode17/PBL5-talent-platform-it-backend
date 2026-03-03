import {
  Controller,
  UseGuards,
  Post,
  Req,
  Body,
  BadRequestException,
  Get,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MessageService } from './message.service.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { EditMessageDto } from './dto/edit-message.dto.js';

interface IUserPayload {
  user_id: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
  seeker_id?: number;
}

@ApiTags('message')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  async send(@Req() req: { user: IUserPayload }, @Body() dto: SendMessageDto) {
    const senderType = req.user.role === 'SEEKER' ? 'SEEKER' : 'EMPLOYEE';
    const senderId =
      req.user.role === 'SEEKER' ? req.user.seeker_id : req.user.user_id;

    if (!senderId) {
      throw new BadRequestException('Không thể xác định ID người gửi');
    }

    return this.messageService.sendMessage(
      dto.chatId,
      dto.content,
      senderType,
      senderId,
    );
  }

  @Get()
  async getMessages(
    @Req() req: { user: IUserPayload },
    @Query('chatId', ParseIntPipe) chatId: number,
    @Query('limit', ParseIntPipe) limit: number = 50,
    @Query('offset', ParseIntPipe) offset: number = 0,
  ) {
    return this.messageService.getMessages(chatId, limit, offset);
  }

  @Post('edit')
  async editMessage(dto: EditMessageDto) {
    return this.messageService.editMessage(dto.messageId, dto.newContent);
  }
}

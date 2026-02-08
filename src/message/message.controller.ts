import { Controller, UseGuards, Post, Req, Body } from '@nestjs/common';
import { MessageService } from './message.service.js';
import { ApiBearerAuth } from '@nestjs/swagger';
import { EmployeeChatGuard, JwtAuthGuard } from 'src/jwt/jwt-auth.guard.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EmployeeChatGuard)
@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  send(@Req() req, @Body() dto: SendMessageDto) {
    return this.messageService.sendMessage(
      dto.chatId,
      dto.content,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.user.role === 'SEEKER' ? 'SEEKER' : 'EMPLOYEE',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req.user.userId,
    );
  }
}

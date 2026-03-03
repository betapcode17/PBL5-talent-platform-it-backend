import { PartialType } from '@nestjs/mapped-types';
import { CreateChatDto } from './create-chat.dto.js';

export class UpdateChatDto extends PartialType(CreateChatDto) {
  chat_id: number;
}

import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { ChatService } from './chat.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
@WebSocketGateway()
export class ChatGateway {
  constructor(private readonly chatService: ChatService) {}

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SubscribeMessage('createChat')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  create(@MessageBody() createChatDto: CreateChatDto) {
    return this.chatService.create(createChatDto);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SubscribeMessage('findAllChat')
  findAll() {
    return this.chatService.findAll();
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SubscribeMessage('findOneChat')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  findOne(@MessageBody() id: number) {
    return this.chatService.findOne(id);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SubscribeMessage('updateChat')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  update(@MessageBody() updateChatDto: UpdateChatDto) {
    return this.chatService.update(updateChatDto.id, updateChatDto);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SubscribeMessage('removeChat')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  remove(@MessageBody() id: number) {
    return this.chatService.remove(id);
  }
}

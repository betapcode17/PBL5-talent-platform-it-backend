import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { PrismaService } from 'src/prisma.service.js';

@WebSocketGateway({ cors: true })
export class ChatGateWay {
  @WebSocketServer()
  server: Server;
  constructor(private prisma: PrismaService) {}
  @SubscribeMessage('joinChat')
  handleJoin(client: Socket, chatId: number) {
    void client.join(`chat:${chatId}`);
  }
  @SubscribeMessage('sendMessage')
  async handleSend(_, payload) {
    const msg = await this.prisma.message.create({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: payload,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.server.to(`chat:${payload.chat_id}`).emit('newMessage', msg);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from '../chat/gateway/chat.gateway.js';
import { PrismaService } from '../prisma.service.js';
import { MessageService } from './message.service.js';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: PrismaService, useValue: {} },
        { provide: ChatGateway, useValue: {} },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

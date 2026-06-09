import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { PrismaService } from '../prisma.service.js';
import { ChatGateway } from './gateway/chat.gateway.js';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: PrismaService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});

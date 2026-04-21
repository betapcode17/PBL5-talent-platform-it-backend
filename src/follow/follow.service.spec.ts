import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service.js';
import { FollowService } from './follow.service.js';

describe('FollowService', () => {
  let service: FollowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FollowService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<FollowService>(FollowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

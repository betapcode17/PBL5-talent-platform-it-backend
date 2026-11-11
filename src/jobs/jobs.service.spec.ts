import { BadRequestException } from '@nestjs/common';
import { JobsService } from './jobs.service.js';

describe('JobsService - searchJobs', () => {
  let service: JobsService;
  let prismaMock: any;
  let notificationsServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      jobPost: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    notificationsServiceMock = {
      notifyRole: jest.fn(),
    };
    service = new JobsService(prismaMock, notificationsServiceMock);
  });

  it('throws BadRequestException when q exceeds 100 characters (101 characters)', async () => {
    const longQuery = {
      q: 'a'.repeat(101),
    };

    await expect(service.searchJobs(longQuery)).rejects.toThrow(
      new BadRequestException('Từ khóa tìm kiếm không được vượt quá 100 ký tự'),
    );
  });

  it('accepts query when q is exactly 100 characters', async () => {
    prismaMock.jobPost.findMany.mockResolvedValue([]);
    prismaMock.jobPost.count.mockResolvedValue(0);

    const validQuery = {
      q: 'a'.repeat(100),
    };

    const result = await service.searchJobs(validQuery);
    expect(result).toBeDefined();
    expect(result.jobs).toEqual([]);
    expect(result.total).toBe(0);
  });
});

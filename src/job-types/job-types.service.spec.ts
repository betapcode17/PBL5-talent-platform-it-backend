import { BadRequestException, ConflictException } from '@nestjs/common';
import { JobTypesService } from './job-types.service.js';

describe('JobTypesService', () => {
  let service: JobTypesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      jobType: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    service = new JobTypesService(prisma);
  });

  it('throws 409 when creating a duplicated job type name', async () => {
    prisma.jobType.findFirst.mockResolvedValue({ job_type_id: 99 });

    await expect(
      service.createJobType({
        name: 'Full-time',
        description: 'duplicate',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when updating category to one of its descendants', async () => {
    prisma.category.findUnique.mockResolvedValueOnce({
      category_id: 1,
      parent_category_id: null,
    });
    prisma.category.findUnique.mockResolvedValueOnce({
      category_id: 2,
      is_active: true,
    });
    prisma.category.findMany.mockResolvedValue([
      { category_id: 1, parent_category_id: null },
      { category_id: 2, parent_category_id: 1 },
      { category_id: 3, parent_category_id: 2 },
    ]);

    await expect(
      service.updateCategory(1, {
        parentId: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { BookmarksService } from './bookmarks.service.js';

type PrismaMock = {
  user: { findUnique: jest.Mock };
  seeker: { findUnique: jest.Mock; create: jest.Mock };
  jobPost: { findUnique: jest.Mock };
  jobBookmark: {
    findFirst: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
};

describe('BookmarksService', () => {
  let service: BookmarksService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      seeker: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      jobPost: {
        findUnique: jest.fn(),
      },
      jobBookmark: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    prisma.user.findUnique.mockResolvedValue({
      user_id: 1,
      role: 'SEEKER',
      is_active: true,
    });
    prisma.seeker.findUnique.mockResolvedValue({ seeker_id: 1 });
    service = new BookmarksService(prisma as unknown as PrismaService);
  });

  it('throws when bookmark already exists', async () => {
    prisma.jobPost.findUnique.mockResolvedValue({
      job_post_id: 10,
      is_active: true,
    });
    prisma.jobBookmark.findFirst.mockResolvedValue({
      job_bookmark_id: 20,
    });

    await expect(service.create(1, { jobId: 10 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when deleting a non-existing bookmark', async () => {
    prisma.jobBookmark.findFirst.mockResolvedValue(null);

    await expect(service.remove(1, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

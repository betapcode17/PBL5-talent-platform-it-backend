import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service.js';

describe('BookmarksService', () => {
  let service: BookmarksService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      seeker: {
        findUnique: jest.fn(),
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

    prisma.seeker.findUnique.mockResolvedValue({ seeker_id: 1 });
    service = new BookmarksService(prisma);
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

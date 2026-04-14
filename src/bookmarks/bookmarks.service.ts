import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateBookmarkDto } from './dto/create-bookmark.dto.js';

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateBookmarkDto) {
    const seekerId = await this.ensureSeekerProfile(userId);

    const job = await this.prisma.jobPost.findUnique({
      where: { job_post_id: dto.jobId },
      select: {
        job_post_id: true,
        is_active: true,
      },
    });

    if (!job || !job.is_active) {
      throw new NotFoundException('Job khong ton tai');
    }

    const existing = await this.prisma.jobBookmark.findFirst({
      where: {
        seeker_id: seekerId,
        job_post_id: dto.jobId,
      },
      select: {
        job_bookmark_id: true,
      },
    });

    if (existing) {
      throw new BadRequestException('Da bookmark job nay');
    }

    const created = await this.prisma.jobBookmark.create({
      data: {
        seeker_id: seekerId,
        job_post_id: dto.jobId,
      },
      select: {
        job_bookmark_id: true,
      },
    });

    return { bookmarkId: created.job_bookmark_id };
  }

  async findAll(userId: number, jobId?: number) {
    const seekerId = await this.ensureSeekerProfile(userId);

    const where = {
      seeker_id: seekerId,
      ...(jobId !== undefined ? { job_post_id: jobId } : {}),
    };

    const bookmarks = await this.prisma.jobBookmark.findMany({
      where,
      orderBy: {
        bookmarked_date: 'desc',
      },
      select: {
        job_bookmark_id: true,
        bookmarked_date: true,
        JobPost: {
          select: {
            job_post_id: true,
            name: true,
            job_title: true,
            job_description: true,
            salary: true,
            work_location: true,
            is_active: true,
            created_date: true,
            updated_date: true,
            Company: {
              select: {
                company_id: true,
                company_name: true,
                company_image: true,
                city: true,
                country: true,
              },
            },
            Category: {
              select: {
                category_id: true,
                name: true,
              },
            },
            JobType: {
              select: {
                job_type_id: true,
                job_type: true,
              },
            },
          },
        },
      },
    });

    return {
      bookmarks: bookmarks
        .filter((bookmark) => bookmark.JobPost.is_active)
        .map((bookmark) => ({
          id: bookmark.job_bookmark_id,
          date: bookmark.bookmarked_date,
          job: {
            id: bookmark.JobPost.job_post_id,
            title: bookmark.JobPost.job_title || bookmark.JobPost.name,
            name: bookmark.JobPost.name,
            description: bookmark.JobPost.job_description,
            salary: bookmark.JobPost.salary,
            workLocation: bookmark.JobPost.work_location,
            isActive: bookmark.JobPost.is_active,
            createdDate: bookmark.JobPost.created_date,
            updatedDate: bookmark.JobPost.updated_date,
            company: bookmark.JobPost.Company,
            category: bookmark.JobPost.Category,
            jobType: bookmark.JobPost.JobType,
          },
        })),
      total: bookmarks.filter((bookmark) => bookmark.JobPost.is_active).length,
    };
  }

  async remove(userId: number, bookmarkId: number) {
    const seekerId = await this.ensureSeekerProfile(userId);

    const bookmark = await this.prisma.jobBookmark.findFirst({
      where: {
        job_bookmark_id: bookmarkId,
        seeker_id: seekerId,
      },
      select: {
        job_bookmark_id: true,
      },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark khong ton tai');
    }

    await this.prisma.jobBookmark.delete({
      where: {
        job_bookmark_id: bookmarkId,
      },
    });

    return { message: 'Deleted' };
  }

  private async ensureSeekerProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        role: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active || user.role !== 'SEEKER') {
      throw new NotFoundException('User khong ton tai');
    }

    const seeker = await this.prisma.seeker.findUnique({
      where: { seeker_id: userId },
      select: {
        seeker_id: true,
      },
    });

    if (seeker) {
      return seeker.seeker_id;
    }

    const createdSeeker = await this.prisma.seeker.create({
      data: {
        seeker_id: userId,
        updated_date: new Date(),
      },
      select: {
        seeker_id: true,
      },
    });

    return createdSeeker.seeker_id;
  }
}

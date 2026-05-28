import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { CreateLikeDto } from './dto/create-like.dto.js';
import { ListCompanyLikesQueryDto } from './dto/list-company-likes.query.dto.js';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateLikeDto) {
    const employee = await this.ensureEmployeeProfile(userId);
    await this.ensureCompanyExists(employee.company_id);
    await this.ensureSeekerExists(dto.seekerId);

    const existing = await this.prisma.companySeekerLike.findFirst({
      where: {
        company_id: employee.company_id,
        seeker_id: dto.seekerId,
      },
      select: {
        company_seeker_like_id: true,
      },
    });

    if (existing) {
      throw new BadRequestException('Da like ung vien nay');
    }

    const created = await this.prisma.companySeekerLike.create({
      data: {
        company_id: employee.company_id,
        seeker_id: dto.seekerId,
        liked_by_employee_id: employee.employee_id,
      },
      select: {
        company_seeker_like_id: true,
      },
    });

    return { likeId: String(created.company_seeker_like_id) };
  }

  async findByCompany(
    userId: number,
    companyId: number,
    query: ListCompanyLikesQueryDto,
  ) {
    const employee = await this.ensureEmployeeProfile(userId);
    await this.ensureCompanyExists(companyId);

    if (employee.company_id !== companyId) {
      throw new ForbiddenException('Ban khong co quyen xem likes cua cong ty nay');
    }

    const where: Prisma.CompanySeekerLikeWhereInput = {
      company_id: companyId,
    };

    const [likes, total] = await Promise.all([
      this.prisma.companySeekerLike.findMany({
        where,
        orderBy: {
          liked_date: 'desc',
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          company_seeker_like_id: true,
          seeker_id: true,
          liked_date: true,
        },
      }),
      this.prisma.companySeekerLike.count({ where }),
    ]);

    return {
      likes: likes.map((like) => ({
        likeId: String(like.company_seeker_like_id),
        seekerId: like.seeker_id,
        date: like.liked_date,
      })),
      total,
      count: likes.length,
    };
  }

  async remove(userId: number, likeId: number) {
    const employee = await this.ensureEmployeeProfile(userId);

    const like = await this.prisma.companySeekerLike.findFirst({
      where: {
        company_seeker_like_id: likeId,
        company_id: employee.company_id,
      },
      select: {
        company_seeker_like_id: true,
      },
    });

    if (!like) {
      throw new NotFoundException('Like khong ton tai');
    }

    await this.prisma.companySeekerLike.delete({
      where: {
        company_seeker_like_id: likeId,
      },
    });

    return { message: 'Unliked' };
  }

  private async ensureEmployeeProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        role: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active || user.role !== 'EMPLOYEE') {
      throw new ForbiddenException('Chi employee moi duoc xem likes cua cong ty');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { employee_id: userId },
      select: {
        employee_id: true,
        company_id: true,
      },
    });

    if (!employee) {
      throw new ForbiddenException('Employee profile khong ton tai');
    }

    return employee;
  }

  private async ensureCompanyExists(companyId: number) {
    const company = await this.prisma.company.findUnique({
      where: { company_id: companyId },
      select: {
        company_id: true,
        is_active: true,
      },
    });

    if (!company || !company.is_active) {
      throw new NotFoundException('Company khong ton tai');
    }

    return company;
  }

  private async ensureSeekerExists(seekerId: number) {
    const seeker = await this.prisma.seeker.findUnique({
      where: { seeker_id: seekerId },
      select: {
        seeker_id: true,
        User: {
          select: {
            is_active: true,
            role: true,
          },
        },
      },
    });

    if (!seeker || !seeker.User.is_active || seeker.User.role !== 'SEEKER') {
      throw new NotFoundException('Seeker khong ton tai');
    }

    return seeker;
  }
}

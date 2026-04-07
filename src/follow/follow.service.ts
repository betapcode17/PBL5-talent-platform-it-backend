import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class FollowService {
  constructor(private prisma: PrismaService) {}

  async followCompany(company_id: number, seeker_id: number) {
    return this.prisma.companyFollow.upsert({
      where: {
        seeker_id_company_id: {
          seeker_id,
          company_id,
        },
      },
      update: {
        is_active: true,
      },
      create: {
        is_active: true,
        Company: {
          connect: { company_id },
        },
        Seeker: {
          connect: { seeker_id },
        },
      },
    });
  }

  // 📌 Unfollow
  async unfollowCompany(company_id: number, seeker_id: number) {
    const existing = await this.prisma.companyFollow.findFirst({
      where: { company_id, seeker_id },
    });

    if (!existing) {
      throw new NotFoundException('Follow not found');
    }

    return this.prisma.companyFollow.update({
      where: { follow_id: existing.follow_id },
      data: { is_active: false },
    });
  }

  // 📌 Danh sách đã follow
  async getFollowedCompanies(seeker_id: number) {
    return this.prisma.companyFollow.findMany({
      where: {
        seeker_id,
        is_active: true,
      },
      include: {
        Company: true, // nếu bạn có relation trong schema.prisma
      },
    });
  }

  // 📌 Check follow
  async isFollowing(company_id: number, seeker_id: number) {
    const follow = await this.prisma.companyFollow.findFirst({
      where: {
        company_id,
        seeker_id,
        is_active: true,
      },
    });

    return !!follow;
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { PrismaService } from '../prisma.service.js';
import { CloudinaryService } from '../upload/cloudinary.service.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

import { Express } from 'express';

@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  private async saveFileLocally(file: Express.Multer.File) {
    const uploadsDir = join(process.cwd(), 'uploads');
    const name = `company-${Date.now()}-${file.originalname}`;
    try {
      // ensure dir exists (best-effort)
      await writeFile(join(uploadsDir, name), file.buffer);
      return `/uploads/${name}`;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // fallback: ignore and return undefined
      return undefined;
    }
  }

  async create(
    dto: CreateCompanyDto,
    user: { sub?: number; role?: string } | null,
    logo?: Express.Multer.File,
  ) {
    if (!dto?.company_name)
      throw new BadRequestException('company_name required');

    // duplicate name check
    const existing = await this.prisma.company.findFirst({
      where: { company_name: dto.company_name },
    });
    if (existing) throw new ConflictException('Company name đã tồn tại');

    // verify ownerEmail if provided
    let ownerUser: Awaited<
      ReturnType<PrismaService['user']['findUnique']>
    > | null = null;
    if (dto.ownerEmail) {
      ownerUser = await this.prisma.user.findUnique({
        where: { email: dto.ownerEmail },
      });
      if (!ownerUser)
        throw new BadRequestException('Owner email không tồn tại');
    }

    // upload logo if provided (local save only)
    const imageUrl: string | null = null;
    if (logo && logo.buffer) {
      // imageUrl = await this.saveFileLocally(logo);
    }

    const company = await this.prisma.company.create({
      data: {
        company_name: dto.company_name,
        profile_description: dto.profile_description ?? null,
        company_type: dto.company_type ?? null,
        company_industry: dto.company_industry ?? null,
        establishment_date: dto.establishment_date
          ? new Date(dto.establishment_date)
          : null,
        company_size: dto.company_size ?? null,
        country: dto.country ?? null,
        city: dto.city ?? null,
        working_days: dto.working_days ?? null,
        working_time: dto.working_time ?? null,
        overtime_policy: dto.overtime_policy ?? null,
        company_website_url: dto.company_website_url ?? null,
        company_email: dto.company_email ?? null,
        company_image: imageUrl ?? dto.company_image ?? null,
        cover_image: dto.cover_image ?? null,
        key_skills: dto.key_skills ?? null,
        why_love_working_here: dto.why_love_working_here ?? null,
        is_active: dto.is_active ?? true,
      },
    });

    // if owner present, upsert employee record to link the owner
    if (ownerUser) {
      await this.prisma.employee.upsert({
        where: { employee_id: ownerUser.user_id },
        update: { company_id: company.company_id, role: 'OWNER' },
        create: {
          employee_id: ownerUser.user_id,
          company_id: company.company_id,
          role: 'OWNER',
          joined_date: new Date(),
        },
      });
    }

    return { company, companyId: company.company_id };
  }

  async findAll(opts: { page: number; industry?: string; q?: string }) {
    const pageSize = 10;
    const skip = (opts.page - 1) * pageSize;
    const where: any = {};

    // filter industry (insensitive)
    if (opts.industry) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.company_industry = { contains: opts.industry, mode: 'insensitive' };
    }

    // filter text search
    if (opts.q) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.OR = [
        { company_name: { contains: opts.q, mode: 'insensitive' } },
        { profile_description: { contains: opts.q, mode: 'insensitive' } },
        { city: { contains: opts.q, mode: 'insensitive' } },
        { country: { contains: opts.q, mode: 'insensitive' } },
        { key_skills: { contains: opts.q, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where,
        skip,
        take: pageSize,
        orderBy: { created_date: 'desc' },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.prisma.company.count({ where }),
    ]);

    return { companies, total };
  }

  async findOne(id: number, user: { sub?: number; role?: string } | null) {
    const company = await this.prisma.company.findUnique({
      where: { company_id: id },
      include: { Employee: true, JobPost: true },
    });
    if (!company) return null;

    // anonymize if company inactive and requester not admin or employee
    const userId = typeof user?.sub === 'number' ? user.sub : undefined;
    const isEmployee = userId
      ? await this.prisma.employee.findFirst({
          where: { company_id: id, employee_id: userId },
        })
      : null;
    if (!company.is_active && user?.role !== 'ADMIN' && !isEmployee) {
      return {
        ...company,
        company_email: null,
        company_website_url: null,
      };
    }

    return {
      company,
      employees: company.Employee ?? [],
      jobs: company.JobPost ?? [],
    };
  }

  async update(
    id: number,
    dto: UpdateCompanyDto,
    user: { sub?: number; role?: string } | null,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { company_id: id },
    });
    if (!company) throw new NotFoundException('Company không tồn tại');

    // only owner or admin can update
    const userId = typeof user?.sub === 'number' ? user.sub : undefined;
    const isOwner = userId
      ? await this.prisma.employee.findFirst({
          where: { company_id: id, employee_id: userId },
        })
      : null;
    if (!isOwner && user?.role !== 'ADMIN')
      throw new BadRequestException('Bạn không phải owner');

    // if email changed we could trigger re-verification (left as TODO)

    const data: Partial<UpdateCompanyDto> = {};
    if (dto.company_name !== undefined) data.company_name = dto.company_name;
    if (dto.profile_description !== undefined)
      data.profile_description = dto.profile_description ?? null;
    if (dto.company_type !== undefined)
      data.company_type = dto.company_type ?? null;
    if (dto.company_industry !== undefined)
      data.company_industry = dto.company_industry ?? null;
    if (dto.establishment_date !== undefined)
      data.establishment_date = dto.establishment_date ?? undefined;
    if (dto.company_size !== undefined)
      data.company_size = dto.company_size ?? null;
    if (dto.country !== undefined) data.country = dto.country ?? null;
    if (dto.city !== undefined) data.city = dto.city ?? null;
    if (dto.working_days !== undefined)
      data.working_days = dto.working_days ?? null;
    if (dto.working_time !== undefined)
      data.working_time = dto.working_time ?? null;
    if (dto.overtime_policy !== undefined)
      data.overtime_policy = dto.overtime_policy ?? null;
    if (dto.company_website_url !== undefined)
      data.company_website_url = dto.company_website_url ?? null;
    if (dto.company_email !== undefined)
      data.company_email = dto.company_email ?? null;
    if (dto.company_image !== undefined)
      data.company_image = dto.company_image ?? null;
    if (dto.cover_image !== undefined)
      data.cover_image = dto.cover_image ?? null;
    if (dto.key_skills !== undefined) data.key_skills = dto.key_skills ?? null;
    if (dto.why_love_working_here !== undefined)
      data.why_love_working_here = dto.why_love_working_here ?? null;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    const updated = await this.prisma.company.update({
      where: { company_id: id },
      data,
    });
    return updated;
  }

  async activate(id: number) {
    const company = await this.prisma.company.update({
      where: { company_id: id },
      data: { is_active: true },
    });
    // TODO: notify employees
    return { message: 'Company activated', company };
  }

  async deactivate(id: number) {
    const company = await this.prisma.company.update({
      where: { company_id: id },
      data: { is_active: false },
    });
    // TODO: revoke job posts (set is_active=false)
    await this.prisma.jobPost.updateMany({
      where: { company_id: id },
      data: { is_active: false },
    });
    return { message: 'Company deactivated', company };
  }

  async remove(id: number) {
    await this.prisma.company.delete({ where: { company_id: id } });
    return { message: 'Deleted' };
  }

  async uploadAvatar(userId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File không tồn tại');
    }

    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new BadRequestException('Company không tồn tại');
    }

    // Upload cloudinary
    const { url } = await this.cloudinary.uploadAvatar(file);

    // Update DB
    await this.prisma.user.update({
      where: { user_id: userId },
      data: { user_image: url },
    });

    return {
      avatarUrl: url,
    };
  }
}

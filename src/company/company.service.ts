import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
      if (user?.role !== 'ADMIN' && (user as any)?.email && dto.ownerEmail !== (user as any).email) {
        throw new ForbiddenException('Bạn chỉ có thể tạo công ty cho chính mình');
      }
      ownerUser = await this.prisma.user.findUnique({
        where: { email: dto.ownerEmail },
      });
      if (!ownerUser)
        throw new BadRequestException('Owner email không tồn tại');
    } else if (user?.sub || (user as any)?.id) {
      const userId = user?.sub ?? (user as any)?.id;
      ownerUser = await this.prisma.user.findUnique({
        where: { user_id: userId },
      });
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
    const where: any = {
      is_active: true,
    };

    // filter industry (insensitive & alias support)
    if (opts.industry) {
      const ind = opts.industry.trim();
      if (/fintech|tài chính/i.test(ind)) {
        where.OR = [
          { company_industry: { contains: 'Finan', mode: 'insensitive' } },
          { company_industry: { contains: 'Tài chính', mode: 'insensitive' } },
          { company_industry: { contains: 'Fintech', mode: 'insensitive' } },
        ];
      } else if (/công nghệ thông tin/i.test(ind)) {
        where.OR = [
          { company_industry: { contains: 'Công nghệ thông tin', mode: 'insensitive' } },
          { company_industry: { contains: 'IT', mode: 'insensitive' } },
          { company_industry: { contains: 'Phần mềm', mode: 'insensitive' } },
          { company_industry: { contains: 'Technology', mode: 'insensitive' } },
        ];
      } else if (/phần mềm|gia công/i.test(ind)) {
        where.OR = [
          { company_industry: { contains: 'Phần mềm', mode: 'insensitive' } },
          { company_industry: { contains: 'IT', mode: 'insensitive' } },
          { company_industry: { contains: 'Gia công', mode: 'insensitive' } },
        ];
      } else if (/trí tuệ nhân tạo|ai/i.test(ind)) {
        where.OR = [
          { company_industry: { contains: 'Trí tuệ nhân tạo', mode: 'insensitive' } },
          { company_industry: { contains: 'AI', mode: 'insensitive' } },
          { company_name: { contains: 'AI', mode: 'insensitive' } },
          { key_skills: { contains: 'AI', mode: 'insensitive' } },
        ];
      } else if (/thương mại điện tử|e-commerce/i.test(ind)) {
        where.OR = [
          { company_industry: { contains: 'Thương mại điện tử', mode: 'insensitive' } },
          { company_industry: { contains: 'E-commerce', mode: 'insensitive' } },
          { company_industry: { contains: 'Ecommerce', mode: 'insensitive' } },
          { company_industry: { contains: 'Retail', mode: 'insensitive' } },
        ];
      } else {
        where.company_industry = { contains: ind, mode: 'insensitive' };
      }
    }

    // filter text search
    if (opts.q) {
      const qCondition = [
        { company_name: { contains: opts.q, mode: 'insensitive' } },
        { profile_description: { contains: opts.q, mode: 'insensitive' } },
        { city: { contains: opts.q, mode: 'insensitive' } },
        { country: { contains: opts.q, mode: 'insensitive' } },
        { key_skills: { contains: opts.q, mode: 'insensitive' } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: qCondition }];
        delete where.OR;
      } else {
        where.OR = qCondition;
      }
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { JobPost: { _count: 'desc' } },
          { created_date: 'desc' },
        ],
        include: {
          _count: {
            select: {
              JobPost: {
                where: { is_active: true },
              },
            },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { companies, total };
  }

  async getTopCompanies(limit: number = 5) {
    const companies = await this.prisma.company.findMany({
      where: {
        is_active: true,
        JobPost: { some: { is_active: true } },
      },
      take: limit,
      orderBy: {
        JobPost: { _count: 'desc' },
      },
      select: {
        company_id: true,
        company_name: true,
        company_image: true,
        city: true,
        company_industry: true,
        _count: {
          select: {
            JobPost: { where: { is_active: true } },
          },
        },
      },
    });

    const logoTones = [
      'from-amber-200 to-yellow-300',
      'from-emerald-950 to-teal-900',
      'from-slate-100 to-stone-200',
      'from-orange-100 to-red-200',
      'from-lime-100 to-emerald-200',
    ];

    return companies.map((c, i) => ({
      id: String(c.company_id),
      name: c.company_name,
      jobsCount: c._count.JobPost,
      logoText: c.company_name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? '')
        .join('') || 'CP',
      logoTone: logoTones[i % logoTones.length],
      companyImage: c.company_image,
      city: c.city,
    }));
  }

  async findOne(id: number, user: { sub?: number; role?: string } | null) {
    const company = await this.prisma.company.findUnique({
      where: { company_id: id },
      include: {
        Employee: {
          select: {
            employee_id: true,
            role: true,
            joined_date: true,
            User: {
              select: {
                full_name: true,
                user_image: true,
                email: true,
              },
            },
          },
        },
        JobPost: {
          where: { is_active: true },
          take: 20,
          orderBy: { created_date: 'desc' },
          select: {
            job_post_id: true,
            name: true,
            job_title: true,
            salary: true,
            work_location: true,
            work_type: true,
            level: true,
            is_active: true,
            created_date: true,
            deadline: true,
          },
        },
      },
    });
    if (!company) return null;

    // Hide inactive companies from public frontend views.
    const userId = typeof user?.sub === 'number' ? user.sub : undefined;
    const isEmployee = userId
      ? await this.prisma.employee.findFirst({
          where: { company_id: id, employee_id: userId },
        })
      : null;
    if (!company.is_active && user?.role !== 'ADMIN' && !isEmployee) {
      return null;
    }

    return {
      company,
      employees: company.Employee ?? [],
      jobs:
        user?.role === 'ADMIN' || isEmployee
          ? (company.JobPost ?? [])
          : (company.JobPost ?? []).filter((job) => job.is_active),
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

  async uploadCompanyImage(
    id: number,
    field: 'company_image' | 'cover_image',
    file: Express.Multer.File,
    user: { sub?: number; role?: string } | null,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh để tải lên');
    }

    const company = await this.prisma.company.findUnique({
      where: { company_id: id },
    });
    if (!company) {
      throw new NotFoundException('Company không tồn tại');
    }

    const userId = typeof user?.sub === 'number' ? user.sub : undefined;
    const isOwner = userId
      ? await this.prisma.employee.findFirst({
          where: { company_id: id, employee_id: userId },
        })
      : null;
    if (!isOwner && user?.role !== 'ADMIN') {
      throw new BadRequestException('Bạn không phải owner');
    }

    const { url } = await this.cloudinary.uploadAvatar(file);

    await this.prisma.company.update({
      where: { company_id: id },
      data: { [field]: url },
    });

    return {
      field,
      imageUrl: url,
    };
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

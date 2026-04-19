import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { SearchJobsQueryDto } from './dto/search-jobs.query.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(actorUserId: number, dto: CreateJobDto) {
    if (dto.salaryRange.min > dto.salaryRange.max) {
      throw new BadRequestException(
        'salaryRange.min khong duoc lon hon salaryRange.max',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { company_id: dto.companyId },
    });
    if (!company) {
      throw new NotFoundException('Company khong ton tai');
    }
    if (!company.is_active) {
      throw new BadRequestException('Company khong hoat dong');
    }

    const category = await this.prisma.category.findUnique({
      where: { category_id: dto.categoryId },
      select: { category_id: true, is_active: true },
    });
    if (!category || !category.is_active) {
      throw new NotFoundException('Category khong ton tai');
    }

    const jobType = await this.prisma.jobType.findUnique({
      where: { job_type_id: dto.jobTypeId },
      select: { job_type_id: true, is_active: true },
    });
    if (!jobType || !jobType.is_active) {
      throw new NotFoundException('Job type khong ton tai');
    }

    const employee = await this.getEmployeeProfile(actorUserId);
    if (employee.company_id !== dto.companyId) {
      throw new ForbiddenException(
        'Ban chi duoc tao job cho cong ty cua minh',
      );
    }

    const salaryText = `${dto.salaryRange.min}-${dto.salaryRange.max}`;
    const requirementsText = dto.requirements.join('\n');

    const created = await this.prisma.jobPost.create({
      data: {
        employee_id: employee.employee_id,
        company_id: dto.companyId,
        category_id: dto.categoryId,
        job_type_id: dto.jobTypeId,
        name: dto.title,
        job_title: dto.title,
        job_description: dto.description,
        candidate_requirements: requirementsText,
        salary: salaryText,
        is_active: true,
        updated_date: new Date(),
      },
      select: { job_post_id: true },
    });

    return { jobId: created.job_post_id };
  }

  async getJobDetail(jobId: number) {
    const job = await this.prisma.jobPost.findUnique({
      where: { job_post_id: jobId },
      include: {
        Company: {
          select: {
            company_id: true,
            company_name: true,
            company_image: true,
            city: true,
            country: true,
            company_type: true,
            company_industry: true,
            company_website_url: true,
            is_active: true,
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
        Employee: {
          select: {
            employee_id: true,
            role: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job khong ton tai');
    }

    const requirements = job.candidate_requirements
      ? job.candidate_requirements
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    const [minSalary, maxSalary] = (job.salary ?? '')
      .split('-')
      .map((value) => Number(value.trim()));

    return {
      id: job.job_post_id,
      title: job.job_title || job.name,
      name: job.name,
      description: job.job_description,
      requirements,
      benefits: job.benefits,
      workLocation: job.work_location,
      workTime: job.work_time,
      workType: job.work_type,
      level: job.level,
      experience: job.experience,
      education: job.education,
      salary: job.salary,
      salaryRange: {
        min: Number.isFinite(minSalary) ? minSalary : null,
        max: Number.isFinite(maxSalary) ? maxSalary : null,
      },
      numberOfHires: job.number_of_hires,
      deadline: job.deadline,
      isActive: job.is_active,
      createdDate: job.created_date,
      updatedDate: job.updated_date,
      company: job.Company,
      category: job.Category,
      jobType: job.JobType,
      employee: job.Employee,
    };
  }

  async searchJobs(query: SearchJobsQueryDto) {
    const keyword = query.q?.trim();
    const categoryKeyword = query.category?.trim();
    const locationKeyword = query.location?.trim();
    const salaryMinRaw = query.salaryMin?.trim();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (!keyword && !categoryKeyword && !locationKeyword && !salaryMinRaw) {
      throw new BadRequestException('Thieu query tim kiem');
    }

    const salaryMinValue = salaryMinRaw
      ? this.parseCurrencyToNumber(salaryMinRaw)
      : null;

    if (salaryMinRaw && salaryMinValue === null) {
      throw new BadRequestException('salaryMin khong hop le');
    }

    const where: Record<string, unknown> = {
      is_active: true,
    };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { job_title: { contains: keyword, mode: 'insensitive' } },
        { job_description: { contains: keyword, mode: 'insensitive' } },
        { candidate_requirements: { contains: keyword, mode: 'insensitive' } },
        { work_location: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const rawJobs = await this.prisma.jobPost.findMany({
      where,
      orderBy: { created_date: 'desc' },
      select: {
        job_post_id: true,
        name: true,
        job_title: true,
        job_description: true,
        work_location: true,
        salary: true,
        is_active: true,
        created_date: true,
        Company: {
          select: {
            company_id: true,
            company_name: true,
            city: true,
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
    });

    const mapped = rawJobs.map((job) => {
      const salaryRange = this.extractSalaryRange(job.salary);
      const categoryName = job.Category?.name ?? '';
      const location = job.work_location || job.Company?.city || '';

      return {
        id: job.job_post_id,
        title: job.job_title || job.name,
        description: job.job_description,
        salary: job.salary,
        salaryRange,
        location,
        isActive: job.is_active,
        createdDate: job.created_date,
        company: job.Company,
        category: job.Category,
        jobType: job.JobType,
        _categoryNameLower: categoryName.toLowerCase(),
        _locationLower: location.toLowerCase(),
      };
    });

    const salaryFiltered =
      salaryMinValue === null
        ? mapped
        : mapped.filter((job) => {
            const comparableSalary =
              job.salaryRange.max ?? job.salaryRange.min ?? null;

            if (comparableSalary === null) {
              return false;
            }

            return comparableSalary >= salaryMinValue;
          });

    const categories = Array.from(
      new Set(
        salaryFiltered
          .map((job) => job.category?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const locations = Array.from(
      new Set(
        salaryFiltered
          .map((job) => job.location)
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const categoryTerm = categoryKeyword?.toLowerCase();
    const locationTerm = locationKeyword?.toLowerCase();

    const filtered = salaryFiltered.filter((job) => {
      const matchCategory = categoryTerm
        ? job._categoryNameLower.includes(categoryTerm)
        : true;

      const matchLocation = locationTerm
        ? job._locationLower.includes(locationTerm)
        : true;

      return matchCategory && matchLocation;
    });

    const total = filtered.length;
    const skip = (page - 1) * limit;

    return {
      jobs: filtered.slice(skip, skip + limit).map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        salary: job.salary,
        salaryRange: job.salaryRange,
        location: job.location,
        isActive: job.isActive,
        createdDate: job.createdDate,
        company: job.company,
        category: job.category,
        jobType: job.jobType,
      })),
      total,
      filters: {
        categories,
        locations,
      },
    };
  }

  async getCompanyJobs(
    companyId: number,
    page: number = 1,
    limit: number = 10,
    active: boolean | undefined,
  ) {
    if (page < 1) {
      throw new BadRequestException('page phai >= 1');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('limit phai tu 1 den 100');
    }

    const company = await this.prisma.company.findUnique({
      where: { company_id: companyId },
      select: { company_id: true },
    });

    if (!company) {
      throw new NotFoundException('Company khong ton tai');
    }

    const where: { company_id: number; is_active?: boolean } = {
      company_id: companyId,
    };

    if (typeof active === 'boolean') {
      where.is_active = active;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.jobPost.findMany({
        where,
        orderBy: { created_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          job_post_id: true,
          job_title: true,
          name: true,
          salary: true,
          is_active: true,
          created_date: true,
          updated_date: true,
          Company: {
            select: {
              company_id: true,
              company_name: true,
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
      }),
      this.prisma.jobPost.count({ where }),
    ]);

    return {
      jobs: jobs.map((job) => ({
        id: job.job_post_id,
        title: job.job_title || job.name,
        salary: job.salary,
        isActive: job.is_active,
        createdDate: job.created_date,
        updatedDate: job.updated_date,
        company: job.Company,
        category: job.Category,
        jobType: job.JobType,
      })),
      total,
    };
  }

  private parseCurrencyToNumber(input: string): number | null {
    const normalized = input
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/,/g, '')
      .replace(/vnd|vnđ|đ/g, '');

    if (!normalized) {
      return null;
    }

    let valueText = normalized;
    let multiplier = 1;

    if (normalized.endsWith('k')) {
      multiplier = 1_000;
      valueText = normalized.slice(0, -1);
    } else if (normalized.endsWith('m')) {
      multiplier = 1_000_000;
      valueText = normalized.slice(0, -1);
    } else if (normalized.endsWith('b')) {
      multiplier = 1_000_000_000;
      valueText = normalized.slice(0, -1);
    }

    const value = Number(valueText);

    if (!Number.isFinite(value) || value < 0) {
      return null;
    }

    return value * multiplier;
  }

  private extractSalaryRange(salary: string | null) {
    if (!salary) {
      return { min: null, max: null };
    }

    const [firstPart, secondPart] = salary.split('-');
    const firstValue = this.parseCurrencyToNumber(firstPart ?? '');
    const secondValue = this.parseCurrencyToNumber(secondPart ?? '');

    if (firstValue === null && secondValue === null) {
      return { min: null, max: null };
    }

    if (firstValue !== null && secondValue === null) {
      return { min: firstValue, max: firstValue };
    }

    if (firstValue === null && secondValue !== null) {
      return { min: secondValue, max: secondValue };
    }

    return {
      min: Math.min(firstValue as number, secondValue as number),
      max: Math.max(firstValue as number, secondValue as number),
    };
  }

  async updateJob(jobId: number, actorUserId: number, dto: UpdateJobDto) {
    const existingJob = await this.prisma.jobPost.findUnique({
      where: { job_post_id: jobId },
      include: {
        Employee: {
          select: {
            employee_id: true,
            company_id: true,
          },
        },
      },
    });

    if (!existingJob) {
      throw new NotFoundException('Job khong ton tai');
    }

    const actor = await this.getEmployeeProfile(actorUserId);
    this.ensureSameCompany(actor.company_id, existingJob.company_id);

    const nextCompanyId = dto.companyId ?? existingJob.company_id;
    const nextCategoryId = dto.categoryId ?? existingJob.category_id;
    const nextJobTypeId = dto.jobTypeId ?? existingJob.job_type_id;

    if (dto.salaryRange && dto.salaryRange.min > dto.salaryRange.max) {
      throw new BadRequestException(
        'salaryRange.min khong duoc lon hon salaryRange.max',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { company_id: nextCompanyId },
      select: { company_id: true, is_active: true },
    });
    if (!company) {
      throw new NotFoundException('Company khong ton tai');
    }
    if (!company.is_active) {
      throw new BadRequestException('Company khong hoat dong');
    }

    const category = await this.prisma.category.findUnique({
      where: { category_id: nextCategoryId },
      select: { category_id: true, is_active: true },
    });
    if (!category || !category.is_active) {
      throw new NotFoundException('Category khong ton tai');
    }

    const jobType = await this.prisma.jobType.findUnique({
      where: { job_type_id: nextJobTypeId },
      select: { job_type_id: true, is_active: true },
    });
    if (!jobType || !jobType.is_active) {
      throw new NotFoundException('Job type khong ton tai');
    }

    if (nextCompanyId !== actor.company_id) {
      throw new BadRequestException(
        'companyId phai trung voi cong ty cua recruiter dang dang nhap',
      );
    }

    const updateData: Record<string, unknown> = {
      company_id: nextCompanyId,
      category_id: nextCategoryId,
      job_type_id: nextJobTypeId,
      updated_date: new Date(),
    };

    if (dto.title !== undefined) {
      updateData.name = dto.title;
      updateData.job_title = dto.title;
    }

    if (dto.description !== undefined) {
      updateData.job_description = dto.description;
    }

    if (dto.requirements !== undefined) {
      updateData.candidate_requirements = dto.requirements.join('\n');
    }

    if (dto.salaryRange !== undefined) {
      updateData.salary = `${dto.salaryRange.min}-${dto.salaryRange.max}`;
    }

    await this.prisma.jobPost.update({
      where: { job_post_id: jobId },
      data: updateData,
    });

    return this.getJobDetail(jobId);
  }

  async deleteJob(jobId: number, actorUserId: number) {
    const job = await this.prisma.jobPost.findUnique({
      where: { job_post_id: jobId },
      select: {
        job_post_id: true,
        is_active: true,
        company_id: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job khong ton tai');
    }

    const actor = await this.getEmployeeProfile(actorUserId);
    this.ensureSameCompany(actor.company_id, job.company_id);

    if (!job.is_active) {
      return {
        message: 'Job da duoc xoa mem truoc do',
        jobId,
        rejectedApplications: 0,
      };
    }

    const now = new Date();

    const rejected = await this.prisma.jobPostActivity.updateMany({
      where: {
        job_post_id: jobId,
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
        rejection_reason: 'Job post was deleted',
        last_updated: now,
      },
    });

    await this.prisma.jobPost.update({
      where: { job_post_id: jobId },
      data: {
        is_active: false,
        updated_date: now,
      },
    });

    return {
      message: 'Deleted',
      jobId,
      rejectedApplications: rejected.count,
    };
  }

  async activateJob(jobId: number, actorUserId: number) {
    const job = await this.prisma.jobPost.findUnique({
      where: { job_post_id: jobId },
      select: {
        job_post_id: true,
        company_id: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job khong ton tai');
    }

    const actor = await this.getEmployeeProfile(actorUserId);
    this.ensureSameCompany(actor.company_id, job.company_id);

    await this.prisma.jobPost.update({
      where: { job_post_id: jobId },
      data: {
        is_active: true,
        updated_date: new Date(),
      },
    });

    return { message: 'Activated' };
  }

  async deactivateJob(jobId: number, actorUserId: number) {
    const job = await this.prisma.jobPost.findUnique({
      where: { job_post_id: jobId },
      select: {
        job_post_id: true,
        company_id: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job khong ton tai');
    }

    const actor = await this.getEmployeeProfile(actorUserId);
    this.ensureSameCompany(actor.company_id, job.company_id);

    await this.prisma.jobPost.update({
      where: { job_post_id: jobId },
      data: {
        is_active: false,
        updated_date: new Date(),
      },
    });

    return { message: 'Deactivated' };
  }

  private async getEmployeeProfile(userId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { employee_id: userId },
      select: {
        employee_id: true,
        company_id: true,
        role: true,
      },
    });

    if (!employee) {
      throw new ForbiddenException(
        'Chi recruiter co ho so employee moi duoc thao tac job',
      );
    }

    return employee;
  }

  private ensureSameCompany(actorCompanyId: number, jobCompanyId: number) {
    if (actorCompanyId !== jobCompanyId) {
      throw new ForbiddenException(
        'Ban khong co quyen thao tac job cua cong ty khac',
      );
    }
  }
}

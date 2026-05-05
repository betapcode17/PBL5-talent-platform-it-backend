import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { GetAdminCompaniesQueryDto } from './dto/get-admin-companies.query.dto.js';
import { GetAdminStatisticsQueryDto } from './dto/get-admin-statistics.query.dto.js';
import { GetAdminUsersQueryDto } from './dto/get-admin-users.query.dto.js';
import { GetAdminJobsQueryDto } from './dto/get-admin-jobs.query.dto.js';

type TimeBucket = {
  label: string;
  from: Date;
  to: Date;
};

type ChartRow = {
  label: string;
  users: number;
  jobs: number;
  applications: number;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatistics(query: GetAdminStatisticsQueryDto) {
    const dailyDays = query.dailyDays ?? 30;
    const weeklyWeeks = query.weeklyWeeks ?? 12;
    const monthlyMonths = query.monthlyMonths ?? 12;
    const dailyBuckets = this.buildDailyBuckets(dailyDays);
    const weeklyBuckets = this.buildWeeklyBuckets(weeklyWeeks);
    const monthlyBuckets = this.buildMonthlyBuckets(monthlyMonths);
    const chartStart = this.minDate([
      dailyBuckets[0].from,
      weeklyBuckets[0].from,
      monthlyBuckets[0].from,
    ]);

    const [
      totalUsers,
      totalJobs,
      totalApps,
      usersForCharts,
      jobsForCharts,
      appsForCharts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.jobPost.count(),
      this.prisma.jobPostActivity.count(),
      this.prisma.user.findMany({
        where: { registration_date: { gte: chartStart } },
        select: { registration_date: true },
      }),
      this.prisma.jobPost.findMany({
        where: {
          created_date: { gte: chartStart },
        },
        select: { created_date: true },
      }),
      this.prisma.jobPostActivity.findMany({
        where: { apply_date: { gte: chartStart } },
        select: { apply_date: true },
      }),
    ]);

    const userDates = usersForCharts.map((item) => item.registration_date);
    const jobDates = jobsForCharts.map((item) => item.created_date);
    const appDates = appsForCharts.map((item) => item.apply_date);

    return {
      totalUsers,
      totalJobs,
      totalApps,
      avgRating: 0,
      charts: {
        daily: this.buildChartRows(dailyBuckets, userDates, jobDates, appDates),
        weekly: this.buildChartRows(
          weeklyBuckets,
          userDates,
          jobDates,
          appDates,
        ),
        monthly: this.buildChartRows(
          monthlyBuckets,
          userDates,
          jobDates,
          appDates,
        ),
      },
    };
  }

  async getUsers(query: Partial<GetAdminUsersQueryDto> = {}) {
    const where: Prisma.UserWhereInput = {};
    const search = query.search?.trim();
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (query.role) {
      where.role = query.role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (typeof query.active === 'boolean') {
      where.is_active = query.active;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { registration_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          user_id: true,
          email: true,
          phone: true,
          gender: true,
          user_image: true,
          role: true,
          is_active: true,
          registration_date: true,
          full_name: true,
          Employee: {
            select: {
              employee_id: true,
              role: true,
              joined_date: true,
              Company: {
                select: {
                  company_id: true,
                  company_name: true,
                  is_active: true,
                },
              },
            },
          },
          Seeker: {
            select: {
              seeker_id: true,
              file_cv: true,
              created_date: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        gender: user.gender,
        userImage: user.user_image,
        role: user.role,
        isActive: user.is_active,
        registrationDate: user.registration_date,
        employee: user.Employee
          ? {
              id: user.Employee.employee_id,
              role: user.Employee.role,
              joinedDate: user.Employee.joined_date,
              company: {
                id: user.Employee.Company.company_id,
                name: user.Employee.Company.company_name,
                isActive: user.Employee.Company.is_active,
              },
            }
          : null,
        seeker: user.Seeker
          ? {
              id: user.Seeker.seeker_id,
              fileCv: user.Seeker.file_cv,
              createdDate: user.Seeker.created_date,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async activeUsers(query: Partial<GetAdminUsersQueryDto> = {}) {
    return this.getUsers({ ...query, active: true });
  }

  async banUsers(query: Partial<GetAdminUsersQueryDto> = {}) {
    return this.getUsers({ ...query, active: false });
  }

  async getCompanies(query: Partial<GetAdminCompaniesQueryDto> = {}) {
    const where: Prisma.CompanyWhereInput = {};
    const industry = query.industry?.trim();
    const search = query.search?.trim();
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (industry) {
      where.company_industry = { contains: industry, mode: 'insensitive' };
    }

    if (typeof query.active === 'boolean') {
      where.is_active = query.active;
    }

    if (search) {
      where.OR = [
        { company_name: { contains: search, mode: 'insensitive' } },
        { company_email: { contains: search, mode: 'insensitive' } },
        { company_industry: { contains: search, mode: 'insensitive' } },
        { company_type: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
        { profile_description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: { created_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          company_id: true,
          company_name: true,
          profile_description: true,
          company_type: true,
          company_industry: true,
          establishment_date: true,
          company_size: true,
          country: true,
          city: true,
          company_website_url: true,
          company_email: true,
          company_image: true,
          cover_image: true,
          is_active: true,
          created_date: true,
          _count: {
            select: {
              Employee: true,
              JobPost: true,
              CompanyFollow: true,
            },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      companies: companies.map((company) => ({
        id: company.company_id,
        name: company.company_name,
        description: company.profile_description,
        type: company.company_type,
        industry: company.company_industry,
        establishmentDate: company.establishment_date,
        size: company.company_size,
        country: company.country,
        city: company.city,
        websiteUrl: company.company_website_url,
        email: company.company_email,
        image: company.company_image,
        coverImage: company.cover_image,
        isActive: company.is_active,
        createdDate: company.created_date,
        totalEmployees: company._count.Employee,
        totalJobs: company._count.JobPost,
        totalFollowers: company._count.CompanyFollow,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async activeCompanies(query: Partial<GetAdminCompaniesQueryDto> = {}) {
    return this.getCompanies({ ...query, active: true });
  }

  async banCompanies(query: Partial<GetAdminCompaniesQueryDto> = {}) {
    return this.getCompanies({ ...query, active: false });
  }

  private buildDailyBuckets(days: number): TimeBucket[] {
    const today = this.startOfUtcDay(new Date());
    const firstDay = this.addUtcDays(today, -(days - 1));

    return Array.from({ length: days }, (_, index) => {
      const from = this.addUtcDays(firstDay, index);
      const to = this.addUtcDays(from, 1);

      return {
        label: this.formatIsoDate(from),
        from,
        to,
      };
    });
  }

  private buildWeeklyBuckets(weeks: number): TimeBucket[] {
    const currentWeek = this.startOfUtcWeek(new Date());
    const firstWeek = this.addUtcDays(currentWeek, -(weeks - 1) * 7);

    return Array.from({ length: weeks }, (_, index) => {
      const from = this.addUtcDays(firstWeek, index * 7);
      const to = this.addUtcDays(from, 7);

      return {
        label: this.formatIsoDate(from),
        from,
        to,
      };
    });
  }

  private buildMonthlyBuckets(months: number): TimeBucket[] {
    const currentMonth = this.startOfUtcMonth(new Date());
    const firstMonth = this.addUtcMonths(currentMonth, -(months - 1));

    return Array.from({ length: months }, (_, index) => {
      const from = this.addUtcMonths(firstMonth, index);
      const to = this.addUtcMonths(from, 1);

      return {
        label: this.formatIsoMonth(from),
        from,
        to,
      };
    });
  }

  private buildChartRows(
    buckets: TimeBucket[],
    userDates: Date[],
    jobDates: Date[],
    appDates: Date[],
  ): ChartRow[] {
    return buckets.map((bucket) => ({
      label: bucket.label,
      users: this.countDatesInBucket(userDates, bucket),
      jobs: this.countDatesInBucket(jobDates, bucket),
      applications: this.countDatesInBucket(appDates, bucket),
    }));
  }

  private countDatesInBucket(dates: Date[], bucket: TimeBucket): number {
    const fromTime = bucket.from.getTime();
    const toTime = bucket.to.getTime();

    return dates.filter((date) => {
      const time = date.getTime();
      return time >= fromTime && time < toTime;
    }).length;
  }

  private minDate(dates: Date[]): Date {
    return new Date(Math.min(...dates.map((date) => date.getTime())));
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private startOfUtcWeek(date: Date): Date {
    const day = date.getUTCDay();
    const offset = day === 0 ? -6 : 1 - day;

    return this.addUtcDays(this.startOfUtcDay(date), offset);
  }

  private startOfUtcMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private addUtcDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);

    return next;
  }

  private addUtcMonths(date: Date, months: number): Date {
    const next = new Date(date);
    next.setUTCMonth(next.getUTCMonth() + months);

    return next;
  }

  private formatIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatIsoMonth(date: Date): string {
    return date.toISOString().slice(0, 7);
  }

  private roundRating(value: number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }

    return Math.round(value * 100) / 100;
  }
  async getJobs(query: Partial<GetAdminJobsQueryDto> = {}) {
    const where: Prisma.JobPostWhereInput = {};
    const search = query.search?.trim();
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'createdDate';
    const sortOrder = query.sortOrder ?? 'desc';

    // Build filters
    if (search) {
      where.OR = [
        { job_title: { contains: search, mode: 'insensitive' } },
        {
          Company: { company_name: { contains: search, mode: 'insensitive' } },
        },
        { name: { contains: search, mode: 'insensitive' } },
        { job_description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.industry) {
      where.Company = {
        company_industry: { contains: query.industry, mode: 'insensitive' },
      };
    }

    if (query.level) {
      where.level = { contains: query.level, mode: 'insensitive' };
    }

    if (query.categoryId) {
      where.category_id = query.categoryId;
    }

    if (query.jobTypeId) {
      where.job_type_id = query.jobTypeId;
    }

    if (typeof query.active === 'boolean') {
      where.is_active = query.active;
    }

    // Salary filter - search in salary string format like "20,000,000 - 100,000,000"
    if (query.minSalary) {
      where.salary = {
        contains: query.minSalary,
        mode: 'insensitive',
      };
    }

    // Deadline filters
    if (query.deadlineFrom || query.deadlineTo) {
      const deadlineFilter: Prisma.DateTimeFilter = {};

      if (query.deadlineFrom) {
        deadlineFilter.gte = new Date(query.deadlineFrom);
      }

      if (query.deadlineTo) {
        deadlineFilter.lte = new Date(query.deadlineTo);
      }

      where.deadline = deadlineFilter;
    }

    // Build orderBy based on sortBy and sortOrder
    const orderByMap: Record<string, Prisma.JobPostOrderByWithRelationInput> = {
      createdDate: { created_date: sortOrder },
      deadline: { deadline: sortOrder },
      salary: { salary: sortOrder },
      numberOfHires: { number_of_hires: sortOrder },
      updatedDate: { updated_date: sortOrder },
    };

    const orderBy = orderByMap[sortBy] || { created_date: 'desc' };

    const jobSelect = {
      job_post_id: true,
      job_title: true,
      name: true,
      job_description: true,
      salary: true,
      level: true,
      experience: true,
      education: true,
      number_of_hires: true,
      deadline: true,
      work_location: true,
      work_type: true,
      is_active: true,
      created_date: true,
      updated_date: true,
      Company: {
        select: {
          company_id: true,
          company_name: true,
          company_email: true,
          company_image: true,
          company_industry: true,
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
      Employee: {
        select: {
          employee_id: true,
          User: {
            select: {
              full_name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          JobPostActivity: true,
        },
      },
    } as const;

    type JobPayload = Prisma.JobPostGetPayload<{ select: typeof jobSelect }>;

    const [jobs, total] = await Promise.all([
      this.prisma.jobPost.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: jobSelect,
      }),
      this.prisma.jobPost.count({ where }),
    ]);

    return {
      jobs: jobs.map((job: JobPayload) => ({
        id: job.job_post_id,
        title: job.job_title,
        name: job.name,
        description: job.job_description,
        salary: job.salary,
        level: job.level,
        experience: job.experience,
        education: job.education,
        numberOfHires: job.number_of_hires,
        deadline: job.deadline,
        workLocation: job.work_location,
        workType: job.work_type,
        applicationsCount: job._count.JobPostActivity,
        isActive: job.is_active,
        createdDate: job.created_date,
        updatedDate: job.updated_date,
        company: {
          id: job.Company.company_id,
          name: job.Company.company_name,
          email: job.Company.company_email,
          image: job.Company.company_image,
          industry: job.Company.company_industry,
          city: job.Company.city,
        },
        category: {
          id: job.Category.category_id,
          name: job.Category.name,
        },
        jobType: {
          id: job.JobType.job_type_id,
          name: job.JobType.job_type,
        },
        createdBy:
          job.Employee && job.Employee.User
            ? {
                id: job.Employee.employee_id,
                name: job.Employee.User.full_name,
                email: job.Employee.User.email,
              }
            : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      sortBy,
      sortOrder,
    };
  }

  async activeJobs(query: Partial<GetAdminJobsQueryDto> = {}) {
    return this.getJobs({ ...query, active: true });
  }

  async banJobs(query: Partial<GetAdminJobsQueryDto> = {}) {
    return this.getJobs({ ...query, active: false });
  }

  async activateUser(userId: number) {
    const user = await this.prisma.user.update({
      where: { user_id: userId },
      data: { is_active: true },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        is_active: true,
      },
    });

    return {
      message: 'User activated',
      user,
    };
  }

  async deactivateUser(userId: number) {
    const user = await this.prisma.user.update({
      where: { user_id: userId },
      data: { is_active: false },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        is_active: true,
      },
    });

    return {
      message: 'User deactivated',
      user,
    };
  }

  async activateCompany(companyId: number) {
    const company = await this.prisma.company.update({
      where: { company_id: companyId },
      data: { is_active: true },
      select: {
        company_id: true,
        company_name: true,
        is_active: true,
      },
    });

    return {
      message: 'Company activated',
      company,
    };
  }

  async deactivateCompany(companyId: number) {
    const { company, bannedEmployees } = await this.prisma.$transaction(
      async (tx) => {
        const updatedCompany = await tx.company.update({
          where: { company_id: companyId },
          data: { is_active: false },
          select: {
            company_id: true,
            company_name: true,
            is_active: true,
          },
        });

        await tx.jobPost.updateMany({
          where: { company_id: companyId },
          data: { is_active: false },
        });

        const employees = await tx.employee.findMany({
          where: { company_id: companyId },
          select: { employee_id: true },
        });

        const employeeIds = employees.map((employee) => employee.employee_id);

        if (employeeIds.length > 0) {
          await tx.user.updateMany({
            where: {
              user_id: { in: employeeIds },
            },
            data: { is_active: false },
          });
        }

        return {
          company: updatedCompany,
          bannedEmployees: employeeIds.length,
        };
      },
    );

    return {
      message: 'Company deactivated',
      company,
      bannedEmployees,
    };
  }

  async activateJob(jobId: number) {
    const job = await this.prisma.jobPost.update({
      where: { job_post_id: jobId },
      data: { is_active: true },
      select: {
        job_post_id: true,
        job_title: true,
        is_active: true,
      },
    });

    return {
      message: 'Job activated',
      job,
    };
  }

  async deactivateJob(jobId: number) {
    const job = await this.prisma.jobPost.update({
      where: { job_post_id: jobId },
      data: { is_active: false },
      select: {
        job_post_id: true,
        job_title: true,
        is_active: true,
      },
    });

    return {
      message: 'Job deactivated',
      job,
    };
  }
}

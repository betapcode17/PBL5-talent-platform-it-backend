import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { GetAdminCompaniesQueryDto } from './dto/get-admin-companies.query.dto.js';
import { GetAdminStatisticsQueryDto } from './dto/get-admin-statistics.query.dto.js';
import { GetAdminUsersQueryDto } from './dto/get-admin-users.query.dto.js';

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
        where: { created_date: { gte: chartStart } },
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

  async getUsers(query: GetAdminUsersQueryDto) {
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

  async getCompanies(query: GetAdminCompaniesQueryDto) {
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
}

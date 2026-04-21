import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { PrismaService } from '../prisma.service.js';
import { MailsService } from '../mails/mails.service.js';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailsService: MailsService,
  ) {}

  async create(dto: CreateEmployeeDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (user) {
      throw new ConflictException('user đã tồn tại');
    }
    const company = await this.prisma.company.findUnique({
      where: { company_id: dto.company_id },
    });

    if (!company) {
      throw new ConflictException('company không tồn tại');
    }

    const rawPassword = randomUUID().replace(/-/g, '').slice(0, 12);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          full_name: dto.full_name,
          phone: dto.phone,
          email: dto.email,
          password: hashedPassword,
          role: 'EMPLOYEE',
          is_active: true,
          registration_date: new Date(),
        },
      });

      const employee = await tx.employee.create({
        data: {
          company_id: dto.company_id,
          joined_date: dto.joined_date ?? new Date(),
          employee_id: createdUser.user_id,
          role: dto.role,
        },
      });

      return { createdUser, employee };
    });

    this.mailsService.sendNewAccountToEmployee(dto.email, rawPassword);

    return {
      message: 'Created successfully and account email sent',
      user_id: created.createdUser.user_id,
      employee_id: created.employee.employee_id,
    };
  }

  private async getEmployeeContext(userId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { employee_id: userId },
      include: {
        Company: {
          select: {
            company_id: true,
            company_name: true,
            company_email: true,
            company_image: true,
            city: true,
            company_website_url: true,
            company_industry: true,
            company_size: true,
          },
        },
        User: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            phone: true,
            user_image: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('employee khong ton tai');
    }

    return employee;
  }

  async getMyProfile(userId: number) {
    const employee = await this.getEmployeeContext(userId);

    return {
      employeeId: employee.employee_id,
      role: employee.role,
      joinedDate: employee.joined_date,
      user: employee.User,
      company: employee.Company,
    };
  }

  async getEmployerDashboard(userId: number) {
    const employee = await this.getEmployeeContext(userId);
    const companyId = employee.company_id;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [
      openJobsCount,
      activeChatsCount,
      totalApplicants,
      hiredCount,
      scheduledInterviewsCount,
      recentJobs,
      recentCandidates,
      applications,
      upcomingInterviews,
    ] = await Promise.all([
      this.prisma.jobPost.count({
        where: { company_id: companyId, is_active: true },
      }),
      this.prisma.chat.count({
        where: { company_id: companyId },
      }),
      this.prisma.jobPostActivity.count({
        where: {
          JobPost: { company_id: companyId },
        },
      }),
      this.prisma.jobPostActivity.count({
        where: {
          JobPost: { company_id: companyId },
          status: 'HIRED',
        },
      }),
      this.prisma.interviewSchedule.count({
        where: {
          JobPostActivity: {
            JobPost: { company_id: companyId },
          },
          status: 'SCHEDULED',
          interview_date: {
            gte: now,
          },
        },
      }),
      this.prisma.jobPost.findMany({
        where: { company_id: companyId },
        orderBy: { created_date: 'desc' },
        take: 6,
        select: {
          job_post_id: true,
          job_title: true,
          name: true,
          salary: true,
          is_active: true,
          created_date: true,
          updated_date: true,
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
          _count: {
            select: {
              JobPostActivity: true,
            },
          },
        },
      }),
      this.prisma.jobPostActivity.findMany({
        where: {
          JobPost: { company_id: companyId },
        },
        orderBy: { apply_date: 'desc' },
        take: 6,
        select: {
          application_id: true,
          apply_date: true,
          current_stage: true,
          status: true,
          Seeker: {
            select: {
              seeker_id: true,
              github_url: true,
              linkedin_url: true,
              portfolio_url: true,
              User: {
                select: {
                  user_id: true,
                  full_name: true,
                  email: true,
                  phone: true,
                  user_image: true,
                },
              },
              SeekerSkill: {
                take: 5,
                select: {
                  Skill: {
                    select: {
                      skill_name: true,
                    },
                  },
                },
              },
            },
          },
          JobPost: {
            select: {
              job_post_id: true,
              job_title: true,
              name: true,
            },
          },
          InterviewSchedule: {
            take: 1,
            orderBy: { interview_date: 'asc' },
            select: {
              id: true,
              interview_date: true,
              interview_type: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.jobPostActivity.findMany({
        where: {
          JobPost: { company_id: companyId },
        },
        select: {
          status: true,
          apply_date: true,
        },
      }),
      this.prisma.interviewSchedule.findMany({
        where: {
          JobPostActivity: {
            JobPost: { company_id: companyId },
          },
          interview_date: {
            gte: now,
            lte: endOfToday,
          },
        },
        orderBy: { interview_date: 'asc' },
        take: 5,
        select: {
          id: true,
          interview_date: true,
          interview_type: true,
          status: true,
          Seeker: {
            select: {
              seeker_id: true,
              User: {
                select: {
                  full_name: true,
                },
              },
            },
          },
          JobPostActivity: {
            select: {
              JobPost: {
                select: {
                  job_post_id: true,
                  job_title: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const newCandidatesCount = applications.filter(
      (item) => item.apply_date >= sevenDaysAgo,
    ).length;
    const passedCount = applications.filter(
      (item) => item.status === 'PASSED',
    ).length;
    const pendingCount = applications.filter(
      (item) => item.status === 'PENDING',
    ).length;
    const rejectedCount = applications.filter(
      (item) => item.status === 'REJECTED' || item.status === 'FAILED',
    ).length;

    return {
      profile: {
        employeeId: employee.employee_id,
        role: employee.role,
        user: employee.User,
        company: employee.Company,
      },
      metrics: {
        openJobsCount,
        totalApplicants,
        activeChatsCount,
        scheduledInterviewsCount,
        hiredCount,
        newCandidatesCount,
      },
      pipeline: {
        newApplicants: pendingCount,
        shortlisted: passedCount,
        interviews: scheduledInterviewsCount,
        hired: hiredCount,
        rejected: rejectedCount,
      },
      jobs: recentJobs.map((job) => ({
        id: job.job_post_id,
        title: job.job_title || job.name,
        salary: job.salary,
        isActive: job.is_active,
        createdDate: job.created_date,
        updatedDate: job.updated_date,
        applicantCount: job._count.JobPostActivity,
        category: job.Category,
        jobType: job.JobType,
      })),
      candidates: recentCandidates.map((candidate) => ({
        applicationId: candidate.application_id,
        appliedAt: candidate.apply_date,
        stage: candidate.current_stage || candidate.status,
        status: candidate.status,
        seeker: {
          id: candidate.Seeker.seeker_id,
          fullName: candidate.Seeker.User?.full_name,
          email: candidate.Seeker.User?.email,
          phone: candidate.Seeker.User?.phone,
          avatar: candidate.Seeker.User?.user_image,
          githubUrl: candidate.Seeker.github_url,
          linkedinUrl: candidate.Seeker.linkedin_url,
          portfolioUrl: candidate.Seeker.portfolio_url,
          skills: candidate.Seeker.SeekerSkill.map(
            (skill) => skill.Skill.skill_name,
          ),
        },
        job: {
          id: candidate.JobPost.job_post_id,
          title: candidate.JobPost.job_title || candidate.JobPost.name,
        },
        nextInterview: candidate.InterviewSchedule[0] ?? null,
      })),
      todayInterviews: upcomingInterviews.map((interview) => ({
        id: interview.id,
        interviewDate: interview.interview_date,
        interviewType: interview.interview_type,
        status: interview.status,
        candidateName: interview.Seeker.User?.full_name,
        jobTitle:
          interview.JobPostActivity.JobPost.job_title ||
          interview.JobPostActivity.JobPost.name,
        jobId: interview.JobPostActivity.JobPost.job_post_id,
      })),
    };
  }

  async getEmployerJobs(userId: number, page = 1, limit = 10) {
    const employee = await this.getEmployeeContext(userId);

    const [jobs, total] = await Promise.all([
      this.prisma.jobPost.findMany({
        where: { company_id: employee.company_id },
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
          work_location: true,
          level: true,
          experience: true,
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
          _count: {
            select: {
              JobPostActivity: true,
            },
          },
        },
      }),
      this.prisma.jobPost.count({
        where: { company_id: employee.company_id },
      }),
    ]);

    return {
      total,
      jobs: jobs.map((job) => ({
        id: job.job_post_id,
        title: job.job_title || job.name,
        salary: job.salary,
        workLocation: job.work_location,
        level: job.level,
        experience: job.experience,
        isActive: job.is_active,
        createdDate: job.created_date,
        updatedDate: job.updated_date,
        applicantCount: job._count.JobPostActivity,
        category: job.Category,
        jobType: job.JobType,
      })),
    };
  }

  async getEmployerCandidates(userId: number, page = 1, limit = 10) {
    const employee = await this.getEmployeeContext(userId);

    const where = {
      JobPost: { company_id: employee.company_id },
    };

    const [applications, total] = await Promise.all([
      this.prisma.jobPostActivity.findMany({
        where,
        orderBy: { apply_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          application_id: true,
          apply_date: true,
          current_stage: true,
          status: true,
          rejection_reason: true,
          Seeker: {
            select: {
              seeker_id: true,
              github_url: true,
              linkedin_url: true,
              portfolio_url: true,
              User: {
                select: {
                  full_name: true,
                  email: true,
                  phone: true,
                  user_image: true,
                },
              },
              SeekerSkill: {
                take: 8,
                select: {
                  Skill: {
                    select: {
                      skill_name: true,
                    },
                  },
                },
              },
            },
          },
          JobPost: {
            select: {
              job_post_id: true,
              job_title: true,
              name: true,
            },
          },
          InterviewSchedule: {
            orderBy: { interview_date: 'asc' },
            take: 1,
            select: {
              id: true,
              interview_date: true,
              interview_type: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.jobPostActivity.count({ where }),
    ]);

    return {
      total,
      candidates: applications.map((application) => ({
        applicationId: application.application_id,
        appliedAt: application.apply_date,
        stage: application.current_stage || application.status,
        status: application.status,
        rejectionReason: application.rejection_reason,
        seeker: {
          id: application.Seeker.seeker_id,
          fullName: application.Seeker.User?.full_name,
          email: application.Seeker.User?.email,
          phone: application.Seeker.User?.phone,
          avatar: application.Seeker.User?.user_image,
          githubUrl: application.Seeker.github_url,
          linkedinUrl: application.Seeker.linkedin_url,
          portfolioUrl: application.Seeker.portfolio_url,
          skills: application.Seeker.SeekerSkill.map(
            (skill) => skill.Skill.skill_name,
          ),
        },
        job: {
          id: application.JobPost.job_post_id,
          title: application.JobPost.job_title || application.JobPost.name,
        },
        nextInterview: application.InterviewSchedule[0] ?? null,
      })),
    };
  }

  async getEmployerInterviews(userId: number, page = 1, limit = 10) {
    const employee = await this.getEmployeeContext(userId);

    const where = {
      JobPostActivity: {
        JobPost: { company_id: employee.company_id },
      },
    };

    const [interviews, total] = await Promise.all([
      this.prisma.interviewSchedule.findMany({
        where,
        orderBy: [{ interview_date: 'asc' }, { created_date: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          interview_round: true,
          interview_type: true,
          interview_date: true,
          start_time: true,
          end_time: true,
          location: true,
          status: true,
          note: true,
          Seeker: {
            select: {
              seeker_id: true,
              User: {
                select: {
                  full_name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          Employee: {
            select: {
              employee_id: true,
              role: true,
              User: {
                select: {
                  full_name: true,
                },
              },
            },
          },
          JobPostActivity: {
            select: {
              application_id: true,
              status: true,
              JobPost: {
                select: {
                  job_post_id: true,
                  job_title: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.interviewSchedule.count({ where }),
    ]);

    return {
      total,
      interviews: interviews.map((interview) => ({
        id: interview.id,
        round: interview.interview_round,
        interviewType: interview.interview_type,
        interviewDate: interview.interview_date,
        startTime: interview.start_time,
        endTime: interview.end_time,
        location: interview.location,
        status: interview.status,
        note: interview.note,
        candidate: {
          id: interview.Seeker.seeker_id,
          fullName: interview.Seeker.User?.full_name,
          email: interview.Seeker.User?.email,
          phone: interview.Seeker.User?.phone,
        },
        interviewer: {
          id: interview.Employee.employee_id,
          fullName: interview.Employee.User?.full_name,
          role: interview.Employee.role,
        },
        job: {
          id: interview.JobPostActivity.JobPost.job_post_id,
          title:
            interview.JobPostActivity.JobPost.job_title ||
            interview.JobPostActivity.JobPost.name,
        },
        applicationStatus: interview.JobPostActivity.status,
      })),
    };
  }

  findAll() {
    return `This action returns all employees`;
  }

  findOne(id: number) {
    return `This action returns a #${id} employee`;
  }

  async update(employee_id: number, dto: UpdateEmployeeDto) {
    const existed = await this.prisma.employee.findUnique({
      where: { employee_id },
    });
    if (!existed) {
      throw new ConflictException('employee không tồn tại');
    }
    await this.prisma.employee.update({ where: { employee_id }, data: dto });
    return { message: 'Update successfully' };
  }

  async remove(id: number) {
    const existed = await this.prisma.employee.findUnique({
      where: { employee_id: id },
    });
    if (!existed) {
      throw new ConflictException('employee không tồn tại');
    }
    await this.prisma.employee.delete({ where: { employee_id: id } });
    return { message: 'Deleted successfully' };
  }
}

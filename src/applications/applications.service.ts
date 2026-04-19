import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, Prisma } from '../generated/prisma/client.js';
import { MailsService } from '../mails/mails.service.js';
import { PrismaService } from '../prisma.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { GetJobApplicationsQueryDto } from './dto/get-job-applications.query.dto.js';
import { GetMyApplicationsQueryDto } from './dto/get-my-applications.query.dto.js';
import { RejectApplicationDto } from './dto/reject-application.dto.js';
import { ApplicationQueryStatus } from './enums/application.enum.js';

type SeekerProfile = {
  seeker_id: number;
  file_cv: string | null;
  User: {
    email: string;
    full_name: string | null;
    is_active: boolean;
  };
};

type EmployeeProfile = {
  employee_id: number;
  company_id: number;
  User: {
    email: string;
    full_name: string | null;
    is_active: boolean;
  };
};

type ManagedJob = {
  job_post_id: number;
  company_id: number;
  is_active: boolean;
  deadline: Date | null;
  name: string;
  job_title: string;
  Company: {
    company_id: number;
    company_name: string;
    company_email: string | null;
    is_active: boolean;
  };
  Employee: {
    employee_id: number;
    User: {
      email: string;
      full_name: string | null;
    };
  };
};

type ApplicationDetail = Prisma.JobPostActivityGetPayload<{
  include: {
    JobPost: {
      include: {
        Company: {
          select: {
            company_id: true;
            company_name: true;
            company_email: true;
          };
        };
        Employee: {
          include: {
            User: {
              select: {
                email: true;
                full_name: true;
              };
            };
          };
        };
      };
    };
    Seeker: {
      include: {
        User: {
          select: {
            email: true;
            full_name: true;
            phone: true;
            user_image: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailsService: MailsService,
  ) {}

  async create(userId: number, dto: CreateApplicationDto) {
    const seeker = await this.ensureSeekerProfile(userId);
    const job = await this.validateJobForApply(dto.jobId);

    const existing = await this.findExistingApplication(
      seeker.seeker_id,
      dto.jobId,
    );

    if (existing) {
      throw new ConflictException('Ban da apply job nay roi');
    }

    const created = await this.prisma.jobPostActivity.create({
      data: {
        seeker_id: seeker.seeker_id,
        job_post_id: dto.jobId,
        cover_letter: dto.coverLetter?.trim() || null,
        cv_url: seeker.file_cv,
        current_stage: 'APPLIED',
        status: ApplicationStatus.PENDING,
        last_updated: new Date(),
      },
      select: {
        application_id: true,
      },
    });

    await this.notifyRecruiterOnApply(created.application_id, job, seeker);

    return {
      appId: created.application_id,
      status: ApplicationQueryStatus.PENDING,
    };
  }

  async findMine(userId: number, query: GetMyApplicationsQueryDto) {
    const seeker = await this.ensureSeekerProfile(userId);
    const where: Prisma.JobPostActivityWhereInput = {
      seeker_id: seeker.seeker_id,
      ...this.buildStatusFilter(query.status),
    };

    const [applications, total] = await Promise.all([
      this.prisma.jobPostActivity.findMany({
        where,
        orderBy: { apply_date: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          JobPost: {
            select: {
              job_post_id: true,
              name: true,
              job_title: true,
              job_description: true,
              salary: true,
              work_location: true,
              work_type: true,
              deadline: true,
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
      }),
      this.prisma.jobPostActivity.count({ where }),
    ]);

    return {
      applications: applications.map((application) => ({
        id: application.application_id,
        status: this.toApiStatus(application.status),
        coverLetter: application.cover_letter,
        cvUrl: application.cv_url,
        currentStage: application.current_stage,
        rejectionReason: application.rejection_reason,
        appliedDate: application.apply_date,
        updatedDate: application.last_updated,
        job: {
          id: application.JobPost.job_post_id,
          title: application.JobPost.job_title || application.JobPost.name,
          name: application.JobPost.name,
          description: application.JobPost.job_description,
          salary: application.JobPost.salary,
          workLocation: application.JobPost.work_location,
          workType: application.JobPost.work_type,
          deadline: application.JobPost.deadline,
          isActive: application.JobPost.is_active,
          createdDate: application.JobPost.created_date,
          updatedDate: application.JobPost.updated_date,
          company: application.JobPost.Company,
          category: application.JobPost.Category,
          jobType: application.JobPost.JobType,
        },
      })),
      total,
    };
  }

  async findByJob(
    jobPostId: number,
    userId: number,
    query: GetJobApplicationsQueryDto,
  ) {
    const employee = await this.ensureEmployeeProfile(userId);
    const job = await this.ensureJobOwnership(jobPostId, employee.company_id);

    const where: Prisma.JobPostActivityWhereInput = {
      job_post_id: jobPostId,
      ...this.buildStatusFilter(query.status),
    };

    const [applications, total] = await Promise.all([
      this.prisma.jobPostActivity.findMany({
        where,
        orderBy: { apply_date: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          Seeker: {
            include: {
              User: {
                select: {
                  email: true,
                  full_name: true,
                  phone: true,
                  user_image: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.jobPostActivity.count({ where }),
    ]);

    return {
      applications: applications.map((application) => ({
        id: application.application_id,
        status: this.toApiStatus(application.status),
        coverLetter: application.cover_letter,
        cvUrl: application.cv_url ?? application.Seeker.file_cv,
        currentStage: application.current_stage,
        rejectionReason: application.rejection_reason,
        appliedDate: application.apply_date,
        updatedDate: application.last_updated,
        candidate: {
          id: application.Seeker.seeker_id,
          fullName: application.Seeker.User.full_name,
          email: application.Seeker.User.email,
          phone: application.Seeker.User.phone,
          userImage: application.Seeker.User.user_image,
          githubUrl: application.Seeker.github_url,
          linkedinUrl: application.Seeker.linkedin_url,
          portfolioUrl: application.Seeker.portfolio_url,
          defaultCvUrl: application.Seeker.file_cv,
        },
      })),
      total,
      job: {
        id: job.job_post_id,
        title: job.job_title || job.name,
      },
    };
  }

  async accept(applicationId: number, userId: number) {
    const employee = await this.ensureEmployeeProfile(userId);
    const application = await this.ensureApplicationOwnership(
      applicationId,
      employee.company_id,
    );

    this.ensureApplicationCanBeAccepted(application);

    await this.prisma.jobPostActivity.update({
      where: { application_id: applicationId },
      data: {
        status: ApplicationStatus.PASSED,
        current_stage: 'APPLICATION_ACCEPTED',
        rejection_reason: null,
        last_updated: new Date(),
      },
    });

    await this.notifySeekerOnAccept(application);
    await this.tryAutoCreateInterview(application.application_id);

    return { message: 'Accepted', nextStep: 'interview' };
  }

  async reject(
    applicationId: number,
    userId: number,
    dto: RejectApplicationDto,
  ) {
    const employee = await this.ensureEmployeeProfile(userId);
    const application = await this.ensureApplicationOwnership(
      applicationId,
      employee.company_id,
    );

    this.ensureApplicationCanBeRejected(application);

    const reason = dto.reason?.trim() || null;

    await this.prisma.jobPostActivity.update({
      where: { application_id: applicationId },
      data: {
        status: ApplicationStatus.REJECTED,
        current_stage: 'APPLICATION_REJECTED',
        rejection_reason: reason,
        last_updated: new Date(),
      },
    });

    await this.notifySeekerOnReject(application, reason);

    return { message: 'Rejected' };
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
      throw new ForbiddenException('Chi seeker moi duoc thao tac application');
    }

    const seeker = await this.prisma.seeker.findUnique({
      where: { seeker_id: userId },
      include: {
        User: {
          select: {
            email: true,
            full_name: true,
            is_active: true,
          },
        },
      },
    });

    if (seeker) {
      return seeker satisfies SeekerProfile;
    }

    const createdSeeker = await this.prisma.seeker.create({
      data: {
        seeker_id: userId,
        updated_date: new Date(),
      },
      include: {
        User: {
          select: {
            email: true,
            full_name: true,
            is_active: true,
          },
        },
      },
    });

    return createdSeeker satisfies SeekerProfile;
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
      throw new ForbiddenException(
        'Chi employee moi duoc thao tac application nay',
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: { employee_id: userId },
      include: {
        User: {
          select: {
            email: true,
            full_name: true,
            is_active: true,
          },
        },
      },
    });

    if (!employee) {
      throw new ForbiddenException('Employee profile khong ton tai');
    }

    return employee satisfies EmployeeProfile;
  }

  private async validateJobForApply(jobId: number) {
    const job = await this.prisma.jobPost.findUnique({
      where: { job_post_id: jobId },
      include: {
        Company: {
          select: {
            company_id: true,
            company_name: true,
            company_email: true,
            is_active: true,
          },
        },
        Employee: {
          include: {
            User: {
              select: {
                email: true,
                full_name: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job khong ton tai');
    }

    if (!job.is_active) {
      throw new BadRequestException('Job khong con mo de ung tuyen');
    }

    if (job.deadline && job.deadline < new Date()) {
      throw new BadRequestException('Job da het han ung tuyen');
    }

    if (!job.Company.is_active) {
      throw new BadRequestException('Cong ty cua job hien tai khong hoat dong');
    }

    return job satisfies ManagedJob;
  }

  private async ensureJobOwnership(jobId: number, companyId: number) {
    const job = await this.prisma.jobPost.findUnique({
      where: { job_post_id: jobId },
      include: {
        Company: {
          select: {
            company_id: true,
            company_name: true,
            company_email: true,
            is_active: true,
          },
        },
        Employee: {
          include: {
            User: {
              select: {
                email: true,
                full_name: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job khong ton tai');
    }

    if (job.company_id !== companyId) {
      throw new ForbiddenException(
        'Ban khong co quyen xem applications cua job nay',
      );
    }

    return job satisfies ManagedJob;
  }

  private async ensureApplicationOwnership(
    applicationId: number,
    companyId: number,
  ) {
    const application = await this.prisma.jobPostActivity.findUnique({
      where: { application_id: applicationId },
      include: {
        JobPost: {
          include: {
            Company: {
              select: {
                company_id: true,
                company_name: true,
                company_email: true,
              },
            },
            Employee: {
              include: {
                User: {
                  select: {
                    email: true,
                    full_name: true,
                  },
                },
              },
            },
          },
        },
        Seeker: {
          include: {
            User: {
              select: {
                email: true,
                full_name: true,
                phone: true,
                user_image: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application khong ton tai');
    }

    if (application.JobPost.company_id !== companyId) {
      throw new ForbiddenException(
        'Ban khong co quyen thao tac application cua cong ty khac',
      );
    }

    return application satisfies ApplicationDetail;
  }

  private async findExistingApplication(seekerId: number, jobId: number) {
    return this.prisma.jobPostActivity.findFirst({
      where: {
        seeker_id: seekerId,
        job_post_id: jobId,
      },
      select: {
        application_id: true,
      },
    });
  }

  private buildStatusFilter(status?: ApplicationQueryStatus) {
    if (!status) {
      return {};
    }

    switch (status) {
      case ApplicationQueryStatus.PENDING:
        return {
          status: ApplicationStatus.PENDING,
        } satisfies Prisma.JobPostActivityWhereInput;
      case ApplicationQueryStatus.ACCEPTED:
        return {
          status: {
            in: [ApplicationStatus.PASSED, ApplicationStatus.HIRED],
          },
        } satisfies Prisma.JobPostActivityWhereInput;
      case ApplicationQueryStatus.REJECTED:
        return {
          status: {
            in: [ApplicationStatus.REJECTED, ApplicationStatus.FAILED],
          },
        } satisfies Prisma.JobPostActivityWhereInput;
      default:
        return {};
    }
  }

  private toApiStatus(status: ApplicationStatus) {
    switch (status) {
      case ApplicationStatus.PASSED:
      case ApplicationStatus.HIRED:
        return ApplicationQueryStatus.ACCEPTED;
      case ApplicationStatus.REJECTED:
      case ApplicationStatus.FAILED:
        return ApplicationQueryStatus.REJECTED;
      case ApplicationStatus.PENDING:
      default:
        return ApplicationQueryStatus.PENDING;
    }
  }

  private ensureApplicationCanBeAccepted(application: ApplicationDetail) {
    const currentStatus = this.toApiStatus(application.status);

    if (currentStatus === ApplicationQueryStatus.ACCEPTED) {
      throw new BadRequestException('Application da duoc chap nhan truoc do');
    }

    if (currentStatus === ApplicationQueryStatus.REJECTED) {
      throw new BadRequestException(
        'Application da bi tu choi, khong the accept',
      );
    }
  }

  private ensureApplicationCanBeRejected(application: ApplicationDetail) {
    const currentStatus = this.toApiStatus(application.status);

    if (currentStatus === ApplicationQueryStatus.REJECTED) {
      throw new BadRequestException('Application da bi tu choi truoc do');
    }

    if (currentStatus === ApplicationQueryStatus.ACCEPTED) {
      throw new BadRequestException(
        'Application da duoc chap nhan, khong the reject',
      );
    }
  }

  private async notifyRecruiterOnApply(
    applicationId: number,
    job: ManagedJob,
    seeker: SeekerProfile,
  ) {
    const recipientEmails = Array.from(
      new Set(
        [job.Employee.User.email, job.Company.company_email].filter(
          (email): email is string => Boolean(email),
        ),
      ),
    );

    if (recipientEmails.length === 0) {
      this.logger.debug(
        `Bo qua recruiter notification cho application #${applicationId} vi khong co email nhan`,
      );
      return;
    }

    await Promise.all(
      recipientEmails.map((recipientEmail) =>
        this.safeSendApplicationMail({
          action: 'submitted',
          applicationId,
          recipientEmail,
          recipientName: job.Employee.User.full_name,
          companyName: job.Company.company_name,
          jobTitle: job.job_title || job.name,
          seekerName: seeker.User.full_name,
        }),
      ),
    );

    this.logger.debug(
      'TODO: tich hop realtime notification cho recruiter khi co notification gateway phu hop',
    );
  }

  private async notifySeekerOnAccept(application: ApplicationDetail) {
    if (!application.Seeker.User.email) {
      return;
    }

    await this.safeSendApplicationMail({
      action: 'accepted',
      applicationId: application.application_id,
      recipientEmail: application.Seeker.User.email,
      recipientName: application.Seeker.User.full_name,
      companyName: application.JobPost.Company.company_name,
      jobTitle: application.JobPost.job_title || application.JobPost.name,
      recruiterName: application.JobPost.Employee.User.full_name,
    });

    this.logger.debug(
      'TODO: phat event realtime application_accepted khi co notification gateway phu hop',
    );
  }

  private async notifySeekerOnReject(
    application: ApplicationDetail,
    reason: string | null,
  ) {
    if (!application.Seeker.User.email) {
      return;
    }

    await this.safeSendApplicationMail({
      action: 'rejected',
      applicationId: application.application_id,
      recipientEmail: application.Seeker.User.email,
      recipientName: application.Seeker.User.full_name,
      companyName: application.JobPost.Company.company_name,
      jobTitle: application.JobPost.job_title || application.JobPost.name,
      recruiterName: application.JobPost.Employee.User.full_name,
      reason,
    });

    this.logger.debug(
      'TODO: phat event realtime application_rejected khi co notification gateway phu hop',
    );
  }

  private async safeSendApplicationMail(
    payload: Parameters<MailsService['sendApplicationUpdate']>[0],
  ) {
    try {
      await this.mailsService.sendApplicationUpdate(payload);
    } catch (error) {
      this.logger.warn(
        `Khong gui duoc application email cho ${payload.recipientEmail}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private async tryAutoCreateInterview(applicationId: number) {
    this.logger.debug(
      `TODO: application #${applicationId} da accepted, co the tao interview tu dong khi business flow du thong tin lich hen`,
    );
  }
}

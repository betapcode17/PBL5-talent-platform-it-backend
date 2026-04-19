import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  InterviewStatus,
  InterviewType,
  Prisma,
} from '../generated/prisma/client.js';
import { MailsService } from '../mails/mails.service.js';
import { PrismaService } from '../prisma.service.js';
import { CancelInterviewDto } from './dto/cancel-interview.dto.js';
import { CompleteInterviewDto } from './dto/complete-interview.dto.js';
import { CreateInterviewDto } from './dto/create-interview.dto.js';
import { GetMyInterviewsQueryDto } from './dto/get-my-interviews.query.dto.js';
import { RescheduleInterviewDto } from './dto/reschedule-interview.dto.js';
import {
  InterviewTypeOption,
  MyInterviewRole,
  MyInterviewStatus,
} from './enums/interview.enum.js';

type UserRole = 'SEEKER' | 'EMPLOYEE' | 'ADMIN';

type EmployeeProfile = {
  employee_id: number;
  company_id: number;
  User: {
    email: string;
    full_name: string | null;
  };
};

type InterviewWithRelations = Prisma.InterviewGetPayload<{
  include: {
    Application: {
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
          };
        };
        Seeker: {
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
          };
        };
      };
    };
    Interviewer: {
      include: {
        User: {
          select: {
            email: true;
            full_name: true;
          };
        };
        Company: {
          select: {
            company_id: true;
            company_name: true;
            company_email: true;
          };
        };
      };
    };
    CreatedBy: {
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
}>;

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailsService: MailsService,
  ) {}

  async create(userId: number, userRole: UserRole, dto: CreateInterviewDto) {
    const employee = await this.ensureEmployeeProfile(userId, userRole);

    if (dto.type === InterviewTypeOption.VIDEO && !dto.link) {
      throw new BadRequestException('Interview video bat buoc phai co link');
    }

    if (dto.type === InterviewTypeOption.VIDEO && dto.link) {
      this.ensureValidVideoLink(dto.link);
    }

    const application = await this.validateApplicationForInterview(
      dto.applicationId,
      employee.company_id,
    );

    const endTime = this.buildEndTime(dto.schedule, dto.duration);
    await this.checkScheduleConflict({
      interviewerId: employee.employee_id,
      seekerId: application.seeker_id,
      schedule: dto.schedule,
      endTime,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          application_id: application.application_id,
          seeker_id: application.seeker_id,
          interviewer_id: employee.employee_id,
          created_by_id: employee.employee_id,
          type: this.toPrismaInterviewType(dto.type),
          schedule: dto.schedule,
          end_time: endTime,
          duration: dto.duration,
          link: dto.link,
          status: InterviewStatus.SCHEDULED,
        },
        select: {
          interview_id: true,
        },
      });

      await tx.jobPostActivity.update({
        where: { application_id: application.application_id },
        data: {
          current_stage: 'INTERVIEW_SCHEDULED',
          last_updated: new Date(),
        },
      });

      return interview;
    });

    const interviewDetail = await this.getInterviewOrThrow(created.interview_id);
    await this.notifyInterviewCreated(interviewDetail);

    return { interviewId: created.interview_id };
  }

  async findMine(
    userId: number,
    userRole: UserRole,
    query: GetMyInterviewsQueryDto,
  ) {
    const employee =
      userRole === 'EMPLOYEE'
        ? await this.ensureEmployeeProfile(userId, userRole)
        : null;

    const where = this.buildMyInterviewsWhereInput(
      userId,
      userRole,
      query,
      employee,
    );
    const orderBy =
      query.status === MyInterviewStatus.UPCOMING
        ? { schedule: 'asc' as const }
        : { schedule: 'desc' as const };

    const [interviews, total] = await Promise.all([
      this.prisma.interview.findMany({
        where,
        include: this.interviewInclude(),
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.interview.count({ where }),
    ]);

    return {
      interviews: interviews.map((interview) => this.mapInterview(interview)),
      total,
    };
  }

  async findByApplication(
    applicationId: number,
    userId: number,
    userRole: UserRole,
  ) {
    await this.ensureApplicationAccess(applicationId, userId, userRole);

    const interviews = await this.prisma.interview.findMany({
      where: { application_id: applicationId },
      include: this.interviewInclude(),
      orderBy: { schedule: 'asc' },
    });

    return {
      interviews: interviews.map((interview) => this.mapInterview(interview)),
    };
  }

  async reschedule(
    interviewId: number,
    userId: number,
    userRole: UserRole,
    dto: RescheduleInterviewDto,
  ) {
    const employee = await this.ensureEmployeeProfile(userId, userRole);
    const interview = await this.ensureInterviewAccess(
      interviewId,
      employee.company_id,
    );
    this.ensureInterviewEditable(interview);

    const nextLink = dto.newLink ?? interview.link;
    if (interview.type === InterviewType.VIDEO && !nextLink) {
      throw new BadRequestException('Interview video bat buoc phai co link');
    }

    if (interview.type === InterviewType.VIDEO && nextLink) {
      this.ensureValidVideoLink(nextLink);
    }

    const nextEndTime = this.buildEndTime(dto.newDate, interview.duration);
    await this.checkScheduleConflict({
      interviewerId: interview.interviewer_id,
      seekerId: interview.seeker_id,
      schedule: dto.newDate,
      endTime: nextEndTime,
      excludeInterviewId: interview.interview_id,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.interview.update({
        where: { interview_id: interviewId },
        data: {
          schedule: dto.newDate,
          end_time: nextEndTime,
          link: nextLink,
          rescheduled_at: new Date(),
        },
        include: this.interviewInclude(),
      });

      await tx.jobPostActivity.update({
        where: { application_id: result.application_id },
        data: {
          current_stage: 'INTERVIEW_RESCHEDULED',
          last_updated: new Date(),
        },
      });

      return result;
    });

    await this.notifyInterviewRescheduled(updated);

    return {
      updatedInterview: this.mapInterview(updated),
    };
  }

  async cancel(
    interviewId: number,
    userId: number,
    userRole: UserRole,
    dto: CancelInterviewDto,
  ) {
    const employee = await this.ensureEmployeeProfile(userId, userRole);
    const interview = await this.ensureInterviewAccess(
      interviewId,
      employee.company_id,
    );

    if (interview.status === InterviewStatus.COMPLETED) {
      throw new BadRequestException('Interview da hoan thanh, khong the huy');
    }

    if (interview.status === InterviewStatus.CANCELLED) {
      throw new BadRequestException('Interview da bi huy truoc do');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.interview.update({
        where: { interview_id: interviewId },
        data: {
          status: InterviewStatus.CANCELLED,
          cancel_reason: dto.reason.trim(),
          cancelled_at: new Date(),
        },
        include: this.interviewInclude(),
      });

      await tx.jobPostActivity.update({
        where: { application_id: result.application_id },
        data: {
          current_stage: 'INTERVIEW_CANCELLED',
          last_updated: new Date(),
        },
      });

      return result;
    });

    await this.notifyInterviewCancelled(updated);

    return { message: 'Cancelled' };
  }

  async complete(
    interviewId: number,
    userId: number,
    userRole: UserRole,
    dto: CompleteInterviewDto,
  ) {
    const employee = await this.ensureEmployeeProfile(userId, userRole);
    const interview = await this.ensureInterviewAccess(
      interviewId,
      employee.company_id,
    );
    this.ensureInterviewEditable(interview);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.interview.update({
        where: { interview_id: interviewId },
        data: {
          status: InterviewStatus.COMPLETED,
          feedback: dto.feedback?.trim() || null,
          rating: dto.rating,
          offer: dto.offer ?? false,
          completed_at: new Date(),
        },
        include: this.interviewInclude(),
      });

      await tx.jobPostActivity.update({
        where: { application_id: result.application_id },
        data: {
          current_stage: 'INTERVIEW_COMPLETED',
          last_updated: new Date(),
        },
      });

      return result;
    });

    await this.handleInterviewCompletion(updated);

    return { message: 'Completed' };
  }

  private async validateApplicationForInterview(
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
          },
        },
        Seeker: {
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

    if (!application) {
      throw new NotFoundException('Application khong ton tai');
    }

    if (application.JobPost.company_id !== companyId) {
      throw new ForbiddenException('Ban khong co quyen thao tac application nay');
    }

    if (application.status !== ApplicationStatus.PASSED) {
      throw new BadRequestException(
        'Chi duoc tao interview cho application da qua vong sang loc',
      );
    }

    return application;
  }

  private async checkScheduleConflict(params: {
    interviewerId: number;
    seekerId: number;
    schedule: Date;
    endTime: Date;
    excludeInterviewId?: number;
  }) {
    const conflict = await this.prisma.interview.findFirst({
      where: {
        status: InterviewStatus.SCHEDULED,
        schedule: { lt: params.endTime },
        end_time: { gt: params.schedule },
        OR: [
          { interviewer_id: params.interviewerId },
          { seeker_id: params.seekerId },
        ],
        ...(params.excludeInterviewId
          ? { NOT: { interview_id: params.excludeInterviewId } }
          : {}),
      },
      select: {
        interview_id: true,
      },
    });

    if (conflict) {
      throw new ConflictException('Lich interview bi trung voi lich hien co');
    }
  }

  private async ensureApplicationAccess(
    applicationId: number,
    userId: number,
    userRole: UserRole,
  ) {
    const application = await this.prisma.jobPostActivity.findUnique({
      where: { application_id: applicationId },
      include: {
        JobPost: {
          select: {
            company_id: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application khong ton tai');
    }

    if (userRole === 'SEEKER') {
      if (application.seeker_id !== userId) {
        throw new ForbiddenException('Ban khong co quyen xem application nay');
      }

      return application;
    }

    if (userRole === 'EMPLOYEE') {
      const employee = await this.ensureEmployeeProfile(userId, userRole);
      if (employee.company_id !== application.JobPost.company_id) {
        throw new ForbiddenException('Ban khong co quyen xem application nay');
      }

      return application;
    }

    throw new ForbiddenException('Ban khong co quyen xem application nay');
  }

  private async ensureInterviewAccess(interviewId: number, companyId: number) {
    const interview = await this.getInterviewOrThrow(interviewId);

    if (interview.Application.JobPost.company_id !== companyId) {
      throw new ForbiddenException('Ban khong co quyen thao tac interview nay');
    }

    return interview;
  }

  private ensureInterviewEditable(interview: InterviewWithRelations) {
    if (interview.status === InterviewStatus.COMPLETED) {
      throw new BadRequestException(
        'Interview da hoan thanh, khong the tiep tuc cap nhat',
      );
    }

    if (interview.status === InterviewStatus.CANCELLED) {
      throw new BadRequestException(
        'Interview da bi huy, khong the tiep tuc cap nhat',
      );
    }
  }

  private buildMyInterviewsWhereInput(
    userId: number,
    userRole: UserRole,
    query: GetMyInterviewsQueryDto,
    employee: EmployeeProfile | null,
  ): Prisma.InterviewWhereInput {
    if (userRole === 'SEEKER') {
      if (query.role === MyInterviewRole.INTERVIEWER) {
        return { interview_id: -1 };
      }

      return {
        seeker_id: userId,
        ...this.buildStatusWhereInput(query.status),
      };
    }

    if (userRole === 'EMPLOYEE' && employee) {
      const baseWhere: Prisma.InterviewWhereInput = {
        Application: {
          is: {
            JobPost: {
              is: {
                company_id: employee.company_id,
              },
            },
          },
        },
        ...this.buildStatusWhereInput(query.status),
      };

      if (query.role === MyInterviewRole.CANDIDATE) {
        return { interview_id: -1 };
      }

      if (query.role === MyInterviewRole.INTERVIEWER) {
        return {
          ...baseWhere,
          OR: [
            { interviewer_id: userId },
            { created_by_id: userId },
          ],
        };
      }

      return baseWhere;
    }

    return { interview_id: -1 };
  }

  private buildStatusWhereInput(
    status: MyInterviewStatus,
  ): Prisma.InterviewWhereInput {
    switch (status) {
      case MyInterviewStatus.UPCOMING:
        return { status: InterviewStatus.SCHEDULED };
      case MyInterviewStatus.COMPLETED:
        return { status: InterviewStatus.COMPLETED };
      case MyInterviewStatus.CANCELLED:
        return { status: InterviewStatus.CANCELLED };
      case MyInterviewStatus.ALL:
      default:
        return {};
    }
  }

  private async ensureEmployeeProfile(userId: number, userRole: UserRole) {
    if (userRole !== 'EMPLOYEE') {
      throw new ForbiddenException('Chi employee moi duoc thuc hien thao tac nay');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { employee_id: userId },
      include: {
        User: {
          select: {
            email: true,
            full_name: true,
          },
        },
      },
    });

    if (!employee) {
      throw new ForbiddenException('Employee profile khong ton tai');
    }

    return employee;
  }

  private async getInterviewOrThrow(interviewId: number) {
    const interview = await this.prisma.interview.findUnique({
      where: { interview_id: interviewId },
      include: this.interviewInclude(),
    });

    if (!interview) {
      throw new NotFoundException('Interview khong ton tai');
    }

    return interview;
  }

  private async notifyInterviewCreated(interview: InterviewWithRelations) {
    await this.sendInterviewEmails('scheduled', interview);
    this.logger.debug(
      'TODO: tich hop websocket/calendar invite khi project co notification service chuyen biet',
    );
  }

  private async notifyInterviewRescheduled(interview: InterviewWithRelations) {
    await this.sendInterviewEmails('rescheduled', interview);
    this.logger.debug(
      'TODO: phat event websocket interview_rescheduled khi co notification gateway phu hop',
    );
  }

  private async notifyInterviewCancelled(interview: InterviewWithRelations) {
    await this.sendInterviewEmails('cancelled', interview);
    this.logger.debug(
      'TODO: phat event websocket interview_cancelled khi co notification gateway phu hop',
    );
  }

  private async handleInterviewCompletion(interview: InterviewWithRelations) {
    await this.sendInterviewEmails('completed', interview);

    if (interview.offer) {
      this.logger.debug(
        'TODO: trigger offer flow khi module offer duoc bo sung vao he thong',
      );
    }
  }

  private async sendInterviewEmails(
    action: 'scheduled' | 'rescheduled' | 'cancelled' | 'completed',
    interview: InterviewWithRelations,
  ) {
    const commonPayload = {
      action,
      interviewId: interview.interview_id,
      schedule: interview.schedule,
      duration: interview.duration,
      type: this.fromPrismaInterviewType(interview.type),
      link: interview.link,
      companyName: interview.Application.JobPost.Company.company_name,
      jobTitle:
        interview.Application.JobPost.job_title ||
        interview.Application.JobPost.name,
      reason: interview.cancel_reason,
      feedback: interview.feedback,
      rating: interview.rating,
    } as const;

    const candidateEmail = interview.Seeker.User.email;
    const interviewerEmail = interview.Interviewer.User.email;

    const emailTasks: Array<Promise<void>> = [];

    if (candidateEmail) {
      emailTasks.push(
        this.safeSendMail({
          ...commonPayload,
          recipientEmail: candidateEmail,
          recipientName: interview.Seeker.User.full_name,
          counterpartName: interview.Interviewer.User.full_name,
        }),
      );
    }

    if (interviewerEmail) {
      emailTasks.push(
        this.safeSendMail({
          ...commonPayload,
          recipientEmail: interviewerEmail,
          recipientName: interview.Interviewer.User.full_name,
          counterpartName: interview.Seeker.User.full_name,
        }),
      );
    }

    await Promise.all(emailTasks);
  }

  private async safeSendMail(payload: Parameters<MailsService['sendInterviewUpdate']>[0]) {
    try {
      await this.mailsService.sendInterviewUpdate(payload);
    } catch (error) {
      this.logger.warn(
        `Khong gui duoc interview email cho ${payload.recipientEmail}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private interviewInclude() {
    return {
      Application: {
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
            },
          },
          Seeker: {
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
            },
          },
        },
      },
      Interviewer: {
        include: {
          User: {
            select: {
              email: true,
              full_name: true,
            },
          },
          Company: {
            select: {
              company_id: true,
              company_name: true,
              company_email: true,
            },
          },
        },
      },
      CreatedBy: {
        include: {
          User: {
            select: {
              email: true,
              full_name: true,
            },
          },
        },
      },
    } satisfies Prisma.InterviewInclude;
  }

  private mapInterview(interview: InterviewWithRelations) {
    return {
      id: interview.interview_id,
      applicationId: interview.application_id,
      type: this.fromPrismaInterviewType(interview.type),
      schedule: interview.schedule,
      endTime: interview.end_time,
      duration: interview.duration,
      link: interview.link,
      status: interview.status.toLowerCase(),
      reason: interview.cancel_reason,
      feedback: interview.feedback,
      rating: interview.rating,
      offer: interview.offer,
      rescheduledAt: interview.rescheduled_at,
      cancelledAt: interview.cancelled_at,
      completedAt: interview.completed_at,
      createdDate: interview.created_date,
      updatedDate: interview.updated_date,
      application: {
        id: interview.Application.application_id,
        status: interview.Application.status,
        currentStage: interview.Application.current_stage,
      },
      job: {
        id: interview.Application.JobPost.job_post_id,
        title:
          interview.Application.JobPost.job_title ||
          interview.Application.JobPost.name,
      },
      company: {
        id: interview.Application.JobPost.Company.company_id,
        name: interview.Application.JobPost.Company.company_name,
        email: interview.Application.JobPost.Company.company_email,
      },
      candidate: {
        id: interview.Seeker.seeker_id,
        fullName: interview.Seeker.User.full_name,
        email: interview.Seeker.User.email,
      },
      interviewer: {
        id: interview.Interviewer.employee_id,
        fullName: interview.Interviewer.User.full_name,
        email: interview.Interviewer.User.email,
        companyId: interview.Interviewer.Company.company_id,
        companyName: interview.Interviewer.Company.company_name,
      },
      createdBy: {
        id: interview.CreatedBy.employee_id,
        fullName: interview.CreatedBy.User.full_name,
        email: interview.CreatedBy.User.email,
      },
    };
  }

  private buildEndTime(schedule: Date, duration: number) {
    return new Date(schedule.getTime() + duration * 60_000);
  }

  private ensureValidVideoLink(link: string) {
    try {
      const parsed = new URL(link);

      if (!parsed.protocol.startsWith('http')) {
        throw new Error('invalid protocol');
      }
    } catch {
      throw new BadRequestException('link phai la URL hop le cho interview video');
    }
  }

  private toPrismaInterviewType(type: InterviewTypeOption) {
    switch (type) {
      case InterviewTypeOption.VIDEO:
        return InterviewType.VIDEO;
      case InterviewTypeOption.PHONE:
        return InterviewType.PHONE;
      case InterviewTypeOption.ONSITE:
      default:
        return InterviewType.ONSITE;
    }
  }

  private fromPrismaInterviewType(type: InterviewType) {
    switch (type) {
      case InterviewType.VIDEO:
        return InterviewTypeOption.VIDEO;
      case InterviewType.PHONE:
        return InterviewTypeOption.PHONE;
      case InterviewType.ONSITE:
      default:
        return InterviewTypeOption.ONSITE;
    }
  }
}

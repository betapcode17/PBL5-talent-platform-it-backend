import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AiScreeningService } from './ai-screening.service.js';
import { RunAiScreeningDto } from './dto/run-ai-screening.dto.js';

@Injectable()
export class AiScreeningQueueService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AiScreeningQueueService.name);
  private workerTimer?: ReturnType<typeof setInterval>;
  private processing = false;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiScreeningService: AiScreeningService,
  ) {}

  onApplicationBootstrap(): void {
    const intervalMs = this.getWorkerIntervalMs();
    this.workerTimer = setInterval(() => {
      this.triggerWorker();
    }, intervalMs);
    this.workerTimer.unref?.();
  }

  onModuleDestroy(): void {
    this.stopping = true;
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = undefined;
    }
  }

  async enqueue(userId: number, jobId: number, dto: RunAiScreeningDto) {
    const { employee } = dto.applicationId
      ? await this.aiScreeningService.validateApplicationForJobAccess(
          userId,
          jobId,
          dto.applicationId,
        )
      : await this.aiScreeningService.validateEmployeeJobAccess(userId, jobId);
    const mode = dto.mode ?? 'fast';
    const limit = dto.limit ?? 20;
    const judgeTopN =
      mode === 'deep' ? Math.min(dto.judgeTopN ?? 10, limit) : null;
    const recentRun = await this.prisma.aiScreeningRun.findFirst({
      where: {
        jobPostId: jobId,
        companyId: employee.company_id,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recentRun) {
      throw new ConflictException(
        'AI Screening đang chạy cho tin tuyển dụng này.',
      );
    }

    let run;
    try {
      run = await this.prisma.aiScreeningRun.create({
        data: {
          jobPostId: jobId,
          ...(dto.applicationId
            ? { applicationId: dto.applicationId }
            : {}),
          employeeId: employee.employee_id,
          companyId: employee.company_id,
          mode,
          limit,
          force: dto.force === true,
          judgeTopN,
          status: 'PENDING',
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'AI Screening đang chạy cho tin tuyển dụng này.',
        );
      }
      throw error;
    }
    this.log('screening_run_queued', {
      runId: run.id,
      jobId,
      companyId: employee.company_id,
      employeeId: employee.employee_id,
      mode,
      limit,
      judgeTopN,
      applicationId: dto.applicationId ?? null,
    });
    return {
      runId: run.id,
      status: 'PENDING',
      message: 'AI screening job has been queued.',
    };
  }

  enqueueIndividualDeepScreening(
    userId: number,
    jobId: number,
    applicationId: number,
  ) {
    return this.enqueue(userId, jobId, {
      applicationId,
      mode: 'deep',
      limit: 1,
      judgeTopN: 1,
      force: true,
    });
  }

  async getRunStatus(userId: number, runId: number) {
    const employee = await this.aiScreeningService.validateEmployeeAccess(userId);
    const run = await this.prisma.aiScreeningRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      throw new NotFoundException('AI screening run khong ton tai');
    }
    if (run.companyId !== employee.company_id) {
      throw new ForbiddenException(
        'Ban khong co quyen xem AI screening run cua cong ty khac',
      );
    }

    return this.serializeRun(run);
  }

  async getActiveRunForJob(userId: number, jobId: number) {
    const { employee } =
      await this.aiScreeningService.validateEmployeeJobAccess(userId, jobId);
    const run = await this.prisma.aiScreeningRun.findFirst({
      where: {
        jobPostId: jobId,
        companyId: employee.company_id,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return run ? this.serializeRun(run) : null;
  }

  async getActiveRun(userId: number) {
    const employee = await this.aiScreeningService.validateEmployeeAccess(userId);
    const run = await this.prisma.aiScreeningRun.findFirst({
      where: {
        companyId: employee.company_id,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return run ? this.serializeRun(run) : null;
  }

  private serializeRun(run: {
    id: number;
    jobPostId?: number;
    applicationId?: number | null;
    mode?: string;
    status: string;
    totalCount: number;
    processedCount: number;
    successCount: number;
    failedCount: number;
    startedAt: Date | null;
    completedAt: Date | null;
    errorMessage: string | null;
    totalDurationMs: number | null;
    extractionDurationMs: number | null;
    scoringDurationMs: number | null;
    judgeDurationMs: number | null;
    saveDurationMs: number | null;
  }) {
    const elapsedSeconds = run.startedAt
      ? Math.max(
          0,
          ((run.completedAt?.getTime() ?? Date.now()) - run.startedAt.getTime()) /
            1000,
        )
      : 0;
    const processingRatePerMinute =
      run.processedCount > 0 && elapsedSeconds > 0
        ? Number(((run.processedCount / elapsedSeconds) * 60).toFixed(1))
        : 0;
    const remainingCount = Math.max(run.totalCount - run.processedCount, 0);
    const estimatedRemainingSeconds =
      processingRatePerMinute > 0 && remainingCount > 0
        ? Math.ceil((remainingCount / processingRatePerMinute) * 60)
        : null;

    return {
      runId: run.id,
      jobId: run.jobPostId ?? null,
      applicationId: run.applicationId ?? null,
      mode: run.mode ?? null,
      status: run.status,
      totalCount: run.totalCount,
      processedCount: run.processedCount,
      successCount: run.successCount,
      failedCount: run.failedCount,
      progressPercent:
        run.totalCount > 0
          ? Math.min(100, Math.round((run.processedCount / run.totalCount) * 100))
          : 0,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      errorMessage: run.errorMessage,
      totalDurationMs: run.totalDurationMs,
      extractionDurationMs: run.extractionDurationMs,
      scoringDurationMs: run.scoringDurationMs,
      judgeDurationMs: run.judgeDurationMs,
      saveDurationMs: run.saveDurationMs,
      processingRatePerMinute,
      estimatedRemainingSeconds,
    };
  }

  async processNextPendingRun(): Promise<boolean> {
    if (this.processing || this.stopping) {
      return false;
    }

    this.processing = true;
    try {
      const pending = await this.prisma.aiScreeningRun.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
      if (!pending) {
        return false;
      }

      const claimed = await this.prisma.aiScreeningRun.updateMany({
        where: { id: pending.id, status: 'PENDING' },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          completedAt: null,
          errorMessage: null,
        },
      });
      if (claimed.count !== 1) {
        return false;
      }

      const runStartedAt = Date.now();
      this.log('screening_run_started', {
        runId: pending.id,
        jobId: pending.jobPostId,
        companyId: pending.companyId,
        employeeId: pending.employeeId,
        mode: pending.mode,
        limit: pending.limit,
        judgeTopN: pending.judgeTopN,
      });
      try {
        await this.aiScreeningService.runAiScreeningForJob(
          pending.employeeId,
          pending.jobPostId,
          {
            mode: pending.mode === 'deep' ? 'deep' : 'fast',
            ...(pending.applicationId === null ||
            pending.applicationId === undefined
              ? {}
              : { applicationId: pending.applicationId }),
            limit: pending.limit,
            force: pending.force,
            ...(pending.judgeTopN === null
              ? {}
              : { judgeTopN: pending.judgeTopN }),
          },
          {
            runId: pending.id,
            onStart: async (totalCount) => {
              await this.prisma.aiScreeningRun.update({
                where: { id: pending.id },
                data: {
                  totalCount,
                  processedCount: 0,
                  successCount: 0,
                  failedCount: 0,
                },
              });
            },
            onProgress: async (progress) => {
              await this.prisma.aiScreeningRun.update({
                where: { id: pending.id },
                data: progress,
              });
            },
            onMetrics: async (metrics) => {
              await this.prisma.aiScreeningRun.update({
                where: { id: pending.id },
                data: metrics,
              });
            },
          },
        );
        const totalDurationMs = Date.now() - runStartedAt;
        await this.prisma.aiScreeningRun.update({
          where: { id: pending.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            totalDurationMs,
          },
        });
        this.log('screening_run_completed', {
          runId: pending.id,
          jobId: pending.jobPostId,
          companyId: pending.companyId,
          employeeId: pending.employeeId,
          mode: pending.mode,
          limit: pending.limit,
          judgeTopN: pending.judgeTopN,
          durationMs: totalDurationMs,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown queue processing error';
        this.logger.error(`AI screening run #${pending.id} failed: ${message}`);
        await this.prisma.aiScreeningRun.update({
          where: { id: pending.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: message,
            totalDurationMs: Date.now() - runStartedAt,
          },
        });
      }

      return true;
    } finally {
      this.processing = false;
    }
  }

  private getWorkerIntervalMs(): number {
    const value = Number(process.env.AI_SCREENING_WORKER_INTERVAL_MS);
    return Number.isInteger(value) && value > 0 ? value : 2000;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private log(event: string, fields: Record<string, unknown>): void {
    this.logger.log(JSON.stringify({ event, ...fields }));
  }

  private triggerWorker(): void {
    void this.processNextPendingRun().catch((error: unknown) => {
      if (this.stopping) {
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown queue worker error';
      this.logger.error(`AI screening queue polling failed: ${message}`);
    });
  }
}

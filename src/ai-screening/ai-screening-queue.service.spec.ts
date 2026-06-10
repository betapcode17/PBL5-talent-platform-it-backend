import {
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AiScreeningQueueService } from './ai-screening-queue.service.js';

const createPrisma = () => ({
  aiScreeningRun: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
});

describe('AiScreeningQueueService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a pending screening run after validating access', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.create.mockResolvedValue({ id: 41, status: 'PENDING' });
    const screening = {
      validateEmployeeJobAccess: jest.fn().mockResolvedValue({
        employee: { employee_id: 7, company_id: 9 },
        job: { job_post_id: 20, company_id: 9 },
      }),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await expect(
      queue.enqueue(7, 20, {
        limit: 30,
        force: true,
        mode: 'deep',
        judgeTopN: 5,
      }),
    ).resolves.toEqual({
      runId: 41,
      status: 'PENDING',
      message: 'AI screening job has been queued.',
    });

    expect(prisma.aiScreeningRun.create).toHaveBeenCalledWith({
      data: {
        jobPostId: 20,
        employeeId: 7,
        companyId: 9,
        mode: 'deep',
        limit: 30,
        force: true,
        judgeTopN: 5,
        status: 'PENDING',
      },
    });
  });

  it('uses safe enqueue defaults for Fast Mode', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.create.mockResolvedValue({ id: 42, status: 'PENDING' });
    const screening = {
      validateEmployeeJobAccess: jest.fn().mockResolvedValue({
        employee: { employee_id: 7, company_id: 9 },
        job: { job_post_id: 20, company_id: 9 },
      }),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await queue.enqueue(7, 20, {});

    expect(prisma.aiScreeningRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mode: 'fast',
        limit: 20,
        force: false,
        judgeTopN: null,
      }),
    });
  });

  it('queues an individual candidate as a forced Deep Mode run', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.create.mockResolvedValue({ id: 43, status: 'PENDING' });
    const screening = {
      validateEmployeeJobAccess: jest.fn().mockResolvedValue({
        employee: { employee_id: 7, company_id: 9 },
        job: { job_post_id: 20, company_id: 9 },
      }),
      validateApplicationForJobAccess: jest.fn().mockResolvedValue({
        employee: { employee_id: 7, company_id: 9 },
        application_id: 77,
      }),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await queue.enqueueIndividualDeepScreening(7, 20, 77);

    expect(screening.validateApplicationForJobAccess).toHaveBeenCalledWith(7, 20, 77);
    expect(prisma.aiScreeningRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobPostId: 20,
        applicationId: 77,
        mode: 'deep',
        limit: 1,
        force: true,
        judgeTopN: 1,
      }),
    });
  });

  it('returns the active run for a job so clients can reconnect after leaving the page', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.findFirst.mockResolvedValue({
      id: 43,
      jobPostId: 20,
      applicationId: null,
      mode: 'fast',
      status: 'RUNNING',
      totalCount: 100,
      processedCount: 25,
      successCount: 24,
      failedCount: 1,
      startedAt: new Date(Date.now() - 60_000),
      completedAt: null,
      errorMessage: null,
      totalDurationMs: null,
      extractionDurationMs: null,
      scoringDurationMs: null,
      judgeDurationMs: null,
      saveDurationMs: null,
    });
    const screening = {
      validateEmployeeJobAccess: jest.fn().mockResolvedValue({
        employee: { employee_id: 7, company_id: 9 },
        job: { job_post_id: 20, company_id: 9 },
      }),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    const result = await queue.getActiveRunForJob(7, 20);

    expect(prisma.aiScreeningRun.findFirst).toHaveBeenCalledWith({
      where: {
        jobPostId: 20,
        companyId: 9,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(
      expect.objectContaining({
        runId: 43,
        jobId: 20,
        mode: 'fast',
        progressPercent: 25,
        processingRatePerMinute: expect.any(Number),
        estimatedRemainingSeconds: expect.any(Number),
      }),
    );
  });

  it('returns the company active run so clients can reconnect after a full reload', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.findFirst.mockResolvedValue({
      id: 44,
      jobPostId: 21,
      applicationId: null,
      mode: 'deep',
      status: 'PENDING',
      totalCount: 0,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      totalDurationMs: null,
      extractionDurationMs: null,
      scoringDurationMs: null,
      judgeDurationMs: null,
      saveDurationMs: null,
    });
    const screening = {
      validateEmployeeAccess: jest
        .fn()
        .mockResolvedValue({ employee_id: 7, company_id: 9 }),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await expect(queue.getActiveRun(7)).resolves.toEqual(
      expect.objectContaining({
        runId: 44,
        jobId: 21,
        status: 'PENDING',
      }),
    );
    expect(prisma.aiScreeningRun.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: 9,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('rejects duplicate active runs for the same job', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.findFirst.mockResolvedValue({
      id: 40,
      status: 'RUNNING',
    });
    const screening = {
      validateEmployeeJobAccess: jest.fn().mockResolvedValue({
        employee: { employee_id: 7, company_id: 9 },
        job: { job_post_id: 20, company_id: 9 },
      }),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await expect(queue.enqueue(7, 20, {})).rejects.toThrow(
      new ConflictException('AI Screening đang chạy cho tin tuyển dụng này.'),
    );
    expect(prisma.aiScreeningRun.create).not.toHaveBeenCalled();
  });

  it('allows a new run immediately after the previous run completed', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.findFirst.mockResolvedValue(null);
    prisma.aiScreeningRun.create.mockResolvedValue({ id: 42, status: 'PENDING' });
    const screening = {
      validateEmployeeJobAccess: jest.fn().mockResolvedValue({
        employee: { employee_id: 7, company_id: 9 },
        job: { job_post_id: 20, company_id: 9 },
      }),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await expect(
      queue.enqueue(7, 20, { mode: 'fast', limit: 4, force: true }),
    ).resolves.toEqual({
      runId: 42,
      status: 'PENDING',
      message: 'AI screening job has been queued.',
    });

    expect(prisma.aiScreeningRun.findFirst).toHaveBeenCalledWith({
      where: {
        jobPostId: 20,
        companyId: 9,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('clamps Deep Mode judgeTopN to limit and ignores it in Fast Mode', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.create
      .mockResolvedValueOnce({ id: 41, status: 'PENDING' })
      .mockResolvedValueOnce({ id: 42, status: 'PENDING' });
    const screening = {
      validateEmployeeJobAccess: jest.fn().mockResolvedValue({
        employee: { employee_id: 7, company_id: 9 },
        job: { job_post_id: 20, company_id: 9 },
      }),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await queue.enqueue(7, 20, { mode: 'deep', limit: 4, judgeTopN: 10 });
    await queue.enqueue(7, 21, { mode: 'fast', limit: 4, judgeTopN: 3 });

    expect(prisma.aiScreeningRun.create.mock.calls[0][0].data.judgeTopN).toBe(4);
    expect(prisma.aiScreeningRun.create.mock.calls[1][0].data.judgeTopN).toBeNull();
  });

  it('writes structured logs without employee email or phone', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.create.mockResolvedValue({ id: 41, status: 'PENDING' });
    const screening = {
      validateEmployeeJobAccess: jest.fn().mockResolvedValue({
        employee: {
          employee_id: 7,
          company_id: 9,
          email: 'sensitive@example.com',
          phone: '0901234567',
        },
        job: { job_post_id: 20, company_id: 9 },
      }),
    };
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await queue.enqueue(7, 20, { mode: 'fast', limit: 4 });

    const output = log.mock.calls.flat().join(' ');
    expect(output).toContain('"jobId":20');
    expect(output).not.toContain('sensitive@example.com');
    expect(output).not.toContain('0901234567');
  });

  it('starts and stops the polling timer with the Nest lifecycle', async () => {
    jest.useFakeTimers();
    process.env.AI_SCREENING_WORKER_INTERVAL_MS = '50';
    const queue = new AiScreeningQueueService(
      createPrisma() as never,
      {} as never,
    );
    const processNext = jest
      .spyOn(queue, 'processNextPendingRun')
      .mockResolvedValue(false);

    try {
      queue.onApplicationBootstrap();
      await jest.advanceTimersByTimeAsync(50);
      expect(processNext).toHaveBeenCalledTimes(1);

      queue.onModuleDestroy();
      await jest.advanceTimersByTimeAsync(100);
      expect(processNext).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env.AI_SCREENING_WORKER_INTERVAL_MS;
      jest.useRealTimers();
    }
  });

  it('uses the default poll interval and refuses work while stopping', async () => {
    jest.useFakeTimers();
    process.env.AI_SCREENING_WORKER_INTERVAL_MS = 'invalid';
    const queue = new AiScreeningQueueService(
      createPrisma() as never,
      {} as never,
    );
    const processNext = jest
      .spyOn(queue, 'processNextPendingRun')
      .mockResolvedValue(false);

    try {
      queue.onApplicationBootstrap();
      await jest.advanceTimersByTimeAsync(1999);
      expect(processNext).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      expect(processNext).toHaveBeenCalledTimes(1);

      queue.onModuleDestroy();
      await expect(queue.processNextPendingRun()).resolves.toBe(false);
    } finally {
      delete process.env.AI_SCREENING_WORKER_INTERVAL_MS;
      jest.useRealTimers();
    }
  });

  it('does not start another claim while a poll is already running', async () => {
    const prisma = createPrisma();
    let resolveFind: (value: null) => void = () => undefined;
    prisma.aiScreeningRun.findFirst.mockReturnValue(
      new Promise<null>((resolve) => {
        resolveFind = resolve;
      }),
    );
    const queue = new AiScreeningQueueService(prisma as never, {} as never);

    const first = queue.processNextPendingRun();
    await expect(queue.processNextPendingRun()).resolves.toBe(false);
    resolveFind(null);
    await expect(first).resolves.toBe(false);
  });

  it('does nothing when no pending run exists or another worker wins the claim', async () => {
    const prisma = createPrisma();
    const queue = new AiScreeningQueueService(prisma as never, {} as never);

    prisma.aiScreeningRun.findFirst.mockResolvedValueOnce(null);
    await expect(queue.processNextPendingRun()).resolves.toBe(false);

    prisma.aiScreeningRun.findFirst.mockResolvedValueOnce({ id: 41 });
    prisma.aiScreeningRun.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(queue.processNextPendingRun()).resolves.toBe(false);
  });

  it('processes a pending run and updates progress until completed', async () => {
    const prisma = createPrisma();
    const run = {
      id: 41,
      jobPostId: 20,
      employeeId: 7,
      mode: 'fast',
      limit: 20,
      force: false,
      judgeTopN: null,
    };
    prisma.aiScreeningRun.findFirst.mockResolvedValue(run);
    prisma.aiScreeningRun.updateMany.mockResolvedValue({ count: 1 });
    const screening = {
      runAiScreeningForJob: jest.fn(
        async (_employeeId, _jobId, _dto, hooks) => {
          await hooks.onStart(2);
          await hooks.onProgress({
            processedCount: 1,
            successCount: 1,
            failedCount: 0,
          });
          await hooks.onProgress({
            processedCount: 2,
            successCount: 1,
            failedCount: 1,
          });
          await hooks.onMetrics({
            extractionDurationMs: 11,
            scoringDurationMs: 12,
            judgeDurationMs: 13,
            saveDurationMs: 14,
          });
        },
      ),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await expect(queue.processNextPendingRun()).resolves.toBe(true);

    expect(prisma.aiScreeningRun.update).toHaveBeenLastCalledWith({
      where: { id: 41 },
      data: expect.objectContaining({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
      }),
    });
    expect(prisma.aiScreeningRun.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: {
        totalCount: 2,
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
      },
    });
    expect(prisma.aiScreeningRun.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: {
        extractionDurationMs: 11,
        scoringDurationMs: 12,
        judgeDurationMs: 13,
        saveDurationMs: 14,
      },
    });
    expect(prisma.aiScreeningRun.update).toHaveBeenLastCalledWith({
      where: { id: 41 },
      data: expect.objectContaining({
        status: 'COMPLETED',
        totalDurationMs: expect.any(Number),
      }),
    });
    expect(prisma.aiScreeningRun.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: {
        processedCount: 2,
        successCount: 1,
        failedCount: 1,
      },
    });
  });

  it('marks a claimed run failed when processing throws', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.findFirst.mockResolvedValue({
      id: 41,
      jobPostId: 20,
      employeeId: 7,
      mode: 'fast',
      limit: 20,
      force: false,
      judgeTopN: null,
    });
    prisma.aiScreeningRun.updateMany.mockResolvedValue({ count: 1 });
    const screening = {
      runAiScreeningForJob: jest.fn().mockRejectedValue(new Error('database down')),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await expect(queue.processNextPendingRun()).resolves.toBe(true);

    expect(prisma.aiScreeningRun.update).toHaveBeenLastCalledWith({
      where: { id: 41 },
      data: expect.objectContaining({
        status: 'FAILED',
        completedAt: expect.any(Date),
        errorMessage: 'database down',
        totalDurationMs: expect.any(Number),
      }),
    });
  });

  it('uses a safe message when processing throws a non-Error value', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.findFirst.mockResolvedValue({
      id: 41,
      jobPostId: 20,
      employeeId: 7,
      mode: 'deep',
      limit: 20,
      force: false,
      judgeTopN: 2,
    });
    prisma.aiScreeningRun.updateMany.mockResolvedValue({ count: 1 });
    const screening = {
      runAiScreeningForJob: jest.fn().mockRejectedValue('offline'),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await queue.processNextPendingRun();

    expect(prisma.aiScreeningRun.update).toHaveBeenLastCalledWith({
      where: { id: 41 },
      data: expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'Unknown queue processing error',
      }),
    });
  });

  it('returns progress only for runs belonging to the employee company', async () => {
    const prisma = createPrisma();
    prisma.aiScreeningRun.findUnique.mockResolvedValue({
      id: 41,
      companyId: 9,
      status: 'RUNNING',
      totalCount: 4,
      processedCount: 1,
      successCount: 1,
      failedCount: 0,
      startedAt: new Date('2026-06-07T10:00:00.000Z'),
      completedAt: null,
      errorMessage: null,
      totalDurationMs: 100,
      extractionDurationMs: 20,
      scoringDurationMs: 30,
      judgeDurationMs: 40,
      saveDurationMs: 10,
    });
    const screening = {
      validateEmployeeAccess: jest
        .fn()
        .mockResolvedValue({ employee_id: 7, company_id: 9 }),
    };
    const queue = new AiScreeningQueueService(prisma as never, screening as never);

    await expect(queue.getRunStatus(7, 41)).resolves.toEqual(expect.objectContaining({
      runId: 41,
      status: 'RUNNING',
      totalCount: 4,
      processedCount: 1,
      successCount: 1,
      failedCount: 0,
      progressPercent: 25,
      startedAt: new Date('2026-06-07T10:00:00.000Z'),
      completedAt: null,
      errorMessage: null,
      totalDurationMs: 100,
      extractionDurationMs: 20,
      scoringDurationMs: 30,
      judgeDurationMs: 40,
      saveDurationMs: 10,
    }));

    prisma.aiScreeningRun.findUnique.mockResolvedValueOnce({
      id: 42,
      companyId: 99,
    });
    await expect(queue.getRunStatus(7, 42)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    prisma.aiScreeningRun.findUnique.mockResolvedValueOnce(null);
    await expect(queue.getRunStatus(7, 404)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.aiScreeningRun.findUnique.mockResolvedValueOnce({
      id: 43,
      companyId: 9,
      status: 'PENDING',
      totalCount: 0,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      totalDurationMs: 0,
      extractionDurationMs: 0,
      scoringDurationMs: 0,
      judgeDurationMs: 0,
      saveDurationMs: 0,
    });
    await expect(queue.getRunStatus(7, 43)).resolves.toEqual(
      expect.objectContaining({ progressPercent: 0 }),
    );

    prisma.aiScreeningRun.findUnique.mockResolvedValueOnce({
      id: 44,
      companyId: 9,
      status: 'RUNNING',
      totalCount: 1,
      processedCount: 2,
      successCount: 2,
      failedCount: 0,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      totalDurationMs: 0,
      extractionDurationMs: 0,
      scoringDurationMs: 0,
      judgeDurationMs: 0,
      saveDurationMs: 0,
    });
    await expect(queue.getRunStatus(7, 44)).resolves.toEqual(
      expect.objectContaining({ progressPercent: 100 }),
    );
  });
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma.service.js';

const describeReal =
  process.env.RUN_AI_SCREENING_REAL_E2E === 'true' ? describe : describe.skip;

describeReal('AI Screening v2 real E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let employeeToken: string;

  const jobId = 1;
  const applicationIds = [3, 4, 5, 6];
  const waitForRun = async (runId: number) => {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const response = await request(app.getHttpServer())
        .get(`/employees/me/ai-screening-runs/${runId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);
      if (response.body.status === 'COMPLETED') {
        return response.body;
      }
      if (response.body.status === 'FAILED') {
        throw new Error(response.body.errorMessage ?? 'AI screening run failed');
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    throw new Error(`AI screening run #${runId} timed out`);
  };

  beforeAll(async () => {
    process.env.AI_SCREENING_COOLDOWN_MS = '0';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const jwtService = app.get(JwtService);
    employeeToken = await jwtService.signAsync(
      {
        sub: 1001,
        email: 'hr.seed@techcorp.com',
        role: 'EMPLOYEE',
        seeker_id: 1001,
      },
      {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn: '1h',
      },
    );

    await prisma.jobPostActivity.updateMany({
      where: { application_id: { in: applicationIds } },
      data: {
        ai_score: null,
        ai_recommendation: null,
        ai_summary: null,
        ai_strengths: Prisma.DbNull,
        ai_concerns: Prisma.DbNull,
        ai_screened_at: null,
        ai_screened_by_id: null,
        ai_model: null,
        ai_raw_result: Prisma.DbNull,
      },
    });
    await prisma.jobAiCriteriaCache.deleteMany({
      where: { jobPostId: jobId },
    });
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  }, 30_000);

  it(
    'screens four real candidates, persists v2 data, and exposes it through applications API',
    async () => {
      await request(app.getHttpServer())
        .post(`/employees/me/jobs/${jobId}/ai-screening`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ limit: 1001, force: false })
        .expect(400);
      await request(app.getHttpServer())
        .post(`/employees/me/jobs/${jobId}/ai-screening`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ limit: 4, mode: 'slow' })
        .expect(400);
      await request(app.getHttpServer())
        .post(`/employees/me/jobs/${jobId}/ai-screening`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ limit: 4, mode: 'deep', judgeTopN: 51 })
        .expect(400);

      const fastStartedAt = Date.now();
      const screeningResponse = await request(app.getHttpServer())
        .post(`/employees/me/jobs/${jobId}/ai-screening`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ limit: 4, force: false })
        .expect(201);
      expect(screeningResponse.body).toEqual({
        runId: expect.any(Number),
        status: 'PENDING',
        message: 'AI screening job has been queued.',
      });
      const fastRun = await waitForRun(screeningResponse.body.runId);
      const fastElapsedMs = Date.now() - fastStartedAt;

      expect(fastRun).toEqual(
        expect.objectContaining({
          status: 'COMPLETED',
          totalCount: 4,
          processedCount: 4,
          successCount: 4,
          failedCount: 0,
          progressPercent: 100,
          totalDurationMs: expect.any(Number),
          extractionDurationMs: expect.any(Number),
          scoringDurationMs: expect.any(Number),
          judgeDurationMs: expect.any(Number),
          saveDurationMs: expect.any(Number),
        }),
      );

      const persisted = await prisma.jobPostActivity.findMany({
        where: { application_id: { in: applicationIds } },
        include: { Seeker: { include: { User: true } } },
      });

      expect(persisted).toHaveLength(4);
      for (const application of persisted) {
        const raw = application.ai_raw_result as Record<string, any>;
        expect(application.status).toBe('APPLIED');
        expect(application.ai_model).toBe(
          'qwen2.5:7b + rule-score-v2-dynamic-weights',
        );
        expect(raw.version).toBe('ai-screening-v2-dynamic-weights');
        expect(raw).toEqual(
          expect.objectContaining({
            jobCriteria: expect.any(Object),
            candidateProfile: expect.any(Object),
            weights: expect.any(Object),
            weightReasoning: expect.any(Object),
            ruleScore: expect.any(Number),
            llmScore: expect.any(Number),
            finalScore: expect.any(Number),
            screeningMode: 'fast',
            judgeTopN: null,
            llmJudgeStatus: 'skipped_fast_mode',
            jobCriteriaCache: 'miss',
            scoreBreakdown: expect.any(Object),
            flags: expect.any(Array),
            riskFlags: expect.any(Array),
            llmJudge: expect.any(Object),
          }),
        );
        expect(
          Object.values(raw.weights).reduce(
            (sum: number, value) => sum + Number(value),
            0,
          ),
        ).toBe(100);
        expect(raw.finalScore).toBe(
          raw.llmJudgeStatus === 'failed' ||
            raw.llmJudgeStatus === 'skipped_fast_mode' ||
            raw.llmJudgeStatus === 'skipped_not_top_n'
            ? raw.ruleScore
            : Math.round(raw.ruleScore * 0.7 + raw.llmScore * 0.3),
        );
      expect(application.ai_score).toBe(raw.finalScore);
      }

      const cachedFastStartedAt = Date.now();
      const cachedFastResponse = await request(app.getHttpServer())
        .post(`/employees/me/jobs/${jobId}/ai-screening`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ limit: 4, force: true, mode: 'fast' })
        .expect(201);
      await waitForRun(cachedFastResponse.body.runId);
      const cachedFastElapsedMs = Date.now() - cachedFastStartedAt;
      const cachedFastPersisted = await prisma.jobPostActivity.findMany({
        where: { application_id: { in: applicationIds } },
      });
      expect(
        cachedFastPersisted.every(
          (application) =>
            (application.ai_raw_result as Record<string, any>)
              .jobCriteriaCache === 'hit',
        ),
      ).toBe(true);

      const byEmail = Object.fromEntries(
        persisted.map((application) => [
          application.Seeker.User.email,
          application.ai_raw_result as Record<string, any>,
        ]),
      );
      expect(byEmail['ai.demo.strong.backend@itjobvn.local'].finalScore).toBeGreaterThan(
        byEmail['ai.demo.low.mobile@itjobvn.local'].finalScore,
      );
      expect(
        byEmail['ai.demo.low.mobile@itjobvn.local'].flags,
      ).toContain('underqualified');
      expect(
        byEmail['ai.demo.low.mobile@itjobvn.local'].flags,
      ).toContain('possibly_overqualified');

      const applicationsResponse = await request(app.getHttpServer())
        .get(`/applications/job/${jobId}?page=1&limit=20`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);
      const apiApplications = applicationsResponse.body.applications.filter(
        (application: { id: number }) => applicationIds.includes(application.id),
      );

      expect(apiApplications).toHaveLength(4);
      for (const application of apiApplications) {
        expect(application).toEqual(
          expect.objectContaining({
            aiScore: expect.any(Number),
            aiRecommendation: expect.any(String),
            aiSummary: expect.any(String),
            aiStrengths: expect.any(Array),
            aiConcerns: expect.any(Array),
            aiScreenedAt: expect.any(String),
            aiModel: 'qwen2.5:7b + rule-score-v2-dynamic-weights',
            ruleScore: expect.any(Number),
            llmScore: expect.any(Number),
            finalScore: expect.any(Number),
            screeningMode: 'fast',
            judgeTopN: null,
            llmJudgeStatus: 'skipped_fast_mode',
            weights: expect.any(Object),
            weightReasoning: expect.any(Object),
            scoreBreakdown: expect.any(Object),
            flags: expect.any(Array),
            riskFlags: expect.any(Array),
          }),
        );
      }

      const skippedResponse = await request(app.getHttpServer())
        .post(`/employees/me/jobs/${jobId}/ai-screening`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ limit: 4, force: false })
        .expect(201);

      expect(skippedResponse.body).toEqual(
        expect.objectContaining({
          runId: expect.any(Number),
          status: 'PENDING',
        }),
      );
      await expect(waitForRun(skippedResponse.body.runId)).resolves.toEqual(
        expect.objectContaining({
          status: 'COMPLETED',
          totalCount: 0,
          processedCount: 0,
          progressPercent: 0,
        }),
      );

      const deepStartedAt = Date.now();
      const deepResponse = await request(app.getHttpServer())
        .post(`/employees/me/jobs/${jobId}/ai-screening`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ limit: 4, force: true, mode: 'deep', judgeTopN: 2 })
        .expect(201);
      const deepRun = await waitForRun(deepResponse.body.runId);
      const deepElapsedMs = Date.now() - deepStartedAt;

      console.log(
        JSON.stringify({
          fastCacheMissElapsedMs: fastElapsedMs,
          fastCacheHitElapsedMs: cachedFastElapsedMs,
          deepTopN: 2,
          deepElapsedMs,
        }),
      );

      expect(deepRun).toEqual(
        expect.objectContaining({
          status: 'COMPLETED',
          totalCount: 4,
          processedCount: 4,
          successCount: 4,
          failedCount: 0,
          progressPercent: 100,
          totalDurationMs: expect.any(Number),
          extractionDurationMs: expect.any(Number),
          scoringDurationMs: expect.any(Number),
          judgeDurationMs: expect.any(Number),
          saveDurationMs: expect.any(Number),
        }),
      );

      const deepPersisted = await prisma.jobPostActivity.findMany({
        where: { application_id: { in: applicationIds } },
      });
      const judgeStatuses = deepPersisted.map(
        (application) =>
          (application.ai_raw_result as Record<string, any>).llmJudgeStatus,
      );

      expect(
        deepPersisted.every((application) => {
          const raw = application.ai_raw_result as Record<string, any>;
          return raw.screeningMode === 'deep' && raw.judgeTopN === 2;
        }),
      ).toBe(true);
      expect(
        judgeStatuses.filter((status) => status === 'skipped_not_top_n'),
      ).toHaveLength(2);
      expect(
        judgeStatuses.filter((status) => status === 'success'),
      ).toHaveLength(2);
      expect(judgeStatuses).not.toContain('failed');

      const judgedApplications = deepPersisted.filter((application) => {
        const raw = application.ai_raw_result as Record<string, any>;
        return raw.llmJudgeStatus === 'success';
      });
      for (const application of judgedApplications) {
        const raw = application.ai_raw_result as Record<string, any>;
        expect(application.ai_summary).toEqual(expect.any(String));
        expect(application.ai_summary).not.toContain('LLM Judge không phản hồi');
        expect(application.ai_strengths).toEqual(expect.any(Array));
        expect(application.ai_concerns).toEqual(expect.any(Array));
        expect(raw.llmJudge).toEqual(
          expect.objectContaining({
            summary: expect.any(String),
            strengths: expect.any(Array),
            concerns: expect.any(Array),
          }),
        );
      }
    },
    30 * 60_000,
  );
});

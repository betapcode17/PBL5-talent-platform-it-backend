import { ForbiddenException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { validate } from 'class-validator';
import { ApplicationStatus } from '../generated/prisma/client.js';
import {
  AiScreeningService,
  type JobCriteria,
} from './ai-screening.service.js';
import { RunAiScreeningDto } from './dto/run-ai-screening.dto.js';

type RefactoredAiScreeningService = AiScreeningService & {
  buildJobDocument(job: any): string;
  buildCandidateDocument(application: any): string;
  extractCandidateProfile(
    application: any,
    candidateDocument: string,
    jobCriteria?: JobCriteria,
  ): Record<string, unknown>;
  getExperienceExtraYears(role: unknown, level: unknown): number | null;
  calculateMaxFit(
    requiredYears: unknown,
    role: unknown,
    level: unknown,
  ): number | null;
  scoreNumericCriterion(
    candidateValue: unknown,
    requiredValue: unknown,
    role: unknown,
    level: unknown,
  ): {
    score: number | null;
    scorePercent: number | null;
    candidateValue: number | null;
    requiredValue: number | null;
    maxFit: number | null;
    flags: string[];
  };
  calculateRuleScore(
    jobCriteria: unknown,
    candidateProfile: unknown,
  ): {
    ruleScore: number;
    weights: Record<string, number>;
    weightReasoning: Record<string, string>;
    breakdown: Record<string, { score: number | null }>;
    flags: string[];
  };
  normalizeWeights(input?: Record<string, number>): Record<string, number>;
  calculateFinalScore(
    ruleScore: unknown,
    llmScore: unknown,
    llmJudgeStatus?: 'success' | 'failed',
  ): number;
  classifyFitLabel(score: number): string;
  safeParseAiJson(rawText: unknown): unknown;
  clampScore(score: unknown): number;
};

const createPrisma = () => ({
  employee: {
    findUnique: jest.fn().mockResolvedValue({
      employee_id: 1,
      company_id: 10,
      User: { role: 'EMPLOYEE', is_active: true },
    }),
  },
  jobPost: {
    findUnique: jest.fn().mockResolvedValue({
      job_post_id: 20,
      company_id: 10,
      job_title: 'Backend Engineer',
      name: 'Backend',
      Category: null,
      JobType: null,
      Company: {},
      JobPostSkill: [],
    }),
  },
  jobPostActivity: {
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
  jobAiCriteriaCache: {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({}),
  },
});

const fallbackWeights = {
  totalExperience: 10,
  mainTechnicalSkillYears: 20,
  apiOrCoreSkillYears: 15,
  requiredSkills: 20,
  preferredSkills: 10,
  domain: 10,
  englishEducationCertificate: 5,
  projectContest: 10,
};

const createJobCriteria = (
  overrides: Partial<JobCriteria> = {},
): JobCriteria => ({
  role: 'backend',
  level: 'senior',
  requiredYears: {
    totalExperience: null,
    mainSkillYears: null,
    apiYears: null,
    domainYears: null,
  },
  mainSkillKeywords: [],
  apiOrCoreSkillKeywords: [],
  requiredSkills: [],
  preferredSkills: [],
  domain: null,
  englishRequirement: null,
  educationRequirement: null,
  certificates: [],
  projectKeywords: [],
  suggestedWeights: fallbackWeights,
  weightReasoning: {
    totalExperience: '',
    mainTechnicalSkillYears: '',
    apiOrCoreSkillYears: '',
    requiredSkills: '',
    preferredSkills: '',
    domain: '',
    englishEducationCertificate: '',
    projectContest: '',
  },
  ...overrides,
});

describe('AiScreeningService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('excludes rejected and failed applications from AI screening', async () => {
    const prisma = createPrisma();

    const service = new AiScreeningService(prisma as never);

    await service.runAiScreeningForJob(1, 20, { limit: 5 });

    expect(prisma.jobPostActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          job_post_id: 20,
          status: {
            notIn: [ApplicationStatus.REJECTED, ApplicationStatus.FAILED],
          },
          ai_screened_at: null,
        },
      }),
    );
  });

  it('keeps screened applications in scope only when force is true', async () => {
    const prisma = createPrisma();
    const service = new AiScreeningService(prisma as never);

    await service.runAiScreeningForJob(1, 20, { force: true });

    expect(prisma.jobPostActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          job_post_id: 20,
          status: {
            notIn: [ApplicationStatus.REJECTED, ApplicationStatus.FAILED],
          },
        },
        orderBy: { apply_date: 'desc' },
        take: 20,
      }),
    );
  });

  it('screens only the requested application during an individual deep analysis', async () => {
    const prisma = createPrisma();
    const service = new AiScreeningService(prisma as never);

    await service.runAiScreeningForJob(1, 20, {
      applicationId: 77,
      force: true,
      mode: 'deep',
      limit: 1,
      judgeTopN: 1,
    });

    expect(prisma.jobPostActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          job_post_id: 20,
          application_id: 77,
          status: {
            notIn: [ApplicationStatus.REJECTED, ApplicationStatus.FAILED],
          },
        },
        take: 1,
      }),
    );
  });

  it('allows screening up to 1000 applications while keeping judgeTopN capped at 50', async () => {
    const valid = Object.assign(new RunAiScreeningDto(), {
      mode: 'deep',
      limit: 1000,
      judgeTopN: 10,
    });
    const invalidLimit = Object.assign(new RunAiScreeningDto(), {
      limit: 1001,
    });
    const invalidMode = Object.assign(new RunAiScreeningDto(), {
      mode: 'slow',
    });
    const invalidTopN = Object.assign(new RunAiScreeningDto(), {
      judgeTopN: 51,
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalidLimit)).resolves.not.toHaveLength(0);
    await expect(validate(invalidMode)).resolves.not.toHaveLength(0);
    await expect(validate(invalidTopN)).resolves.not.toHaveLength(0);
  });

  it('defaults to fast mode and skips LLM Judge', async () => {
    const prisma = createPrisma();
    prisma.jobPostActivity.findMany.mockResolvedValue([
      { application_id: 7, Seeker: {} },
    ] as never);
    prisma.jobPostActivity.update.mockResolvedValue({} as never);
    const service = new AiScreeningService(prisma as never);
    const criteria = createJobCriteria();
    const ruleResult = service.calculateRuleScore(
      criteria,
      service.extractCandidateProfile({}, 'candidate', criteria),
    );
    ruleResult.ruleScore = 75;
    jest.spyOn(service, 'extractJobCriteria').mockResolvedValue(criteria);
    jest.spyOn(service, 'calculateRuleScore').mockReturnValue(ruleResult);
    const judge = jest.spyOn(service, 'judgeCandidateWithLLM');

    const response = await service.runAiScreeningForJob(1, 20, {});

    expect(judge).not.toHaveBeenCalled();
    expect(response).toEqual(
      expect.objectContaining({
        screeningMode: 'fast',
        judgeTopN: null,
        results: [
          expect.objectContaining({
            applicationId: 7,
            score: 75,
            ruleScore: 75,
            llmScore: 75,
            finalScore: 75,
            llmJudgeStatus: 'skipped_fast_mode',
            riskFlags: ['llm_judge_skipped_fast_mode'],
          }),
        ],
      }),
    );
    expect(prisma.jobPostActivity.update).toHaveBeenCalledWith({
      where: { application_id: 7 },
      data: expect.objectContaining({
        ai_score: 75,
        ai_recommendation: 'MATCH',
        ai_raw_result: expect.objectContaining({
          screeningMode: 'fast',
          judgeTopN: null,
          llmJudgeStatus: 'skipped_fast_mode',
          ruleScore: 75,
          llmScore: 75,
          finalScore: 75,
          riskFlags: ['llm_judge_skipped_fast_mode'],
        }),
      }),
    });
  });

  it('deep mode judges only the Top N by Rule Score', async () => {
    const prisma = createPrisma();
    prisma.jobPostActivity.findMany.mockResolvedValue([
      { application_id: 1, Seeker: {} },
      { application_id: 2, Seeker: {} },
      { application_id: 3, Seeker: {} },
    ] as never);
    prisma.jobPostActivity.update.mockResolvedValue({} as never);
    const service = new AiScreeningService(prisma as never);
    const criteria = createJobCriteria();
    const baseRule = service.calculateRuleScore(
      criteria,
      service.extractCandidateProfile({}, 'candidate', criteria),
    );
    jest.spyOn(service, 'extractJobCriteria').mockResolvedValue(criteria);
    jest
      .spyOn(service, 'calculateRuleScore')
      .mockReturnValueOnce({ ...baseRule, ruleScore: 40 })
      .mockReturnValueOnce({ ...baseRule, ruleScore: 90 })
      .mockReturnValueOnce({ ...baseRule, ruleScore: 70 });
    const judge = jest
      .spyOn(service, 'judgeCandidateWithLLM')
      .mockImplementation(async (_job, _criteria, _profile, rule) => ({
        score: rule.ruleScore,
        recommendation: service.classifyFitLabel(rule.ruleScore),
        summary: 'deep',
        strengths: [],
        concerns: [],
        rawResult: {
          screeningMode: 'deep',
          judgeTopN: 2,
          llmJudgeStatus: 'success',
          ruleScore: rule.ruleScore,
          llmScore: rule.ruleScore,
          finalScore: rule.ruleScore,
          riskFlags: [],
        },
        model: 'qwen2.5:7b + rule-score-v2-dynamic-weights',
        isFallback: false,
      }));

    await expect(service.runAiScreeningForJob(1, 20, {
      mode: 'deep',
      judgeTopN: 2,
    } as RunAiScreeningDto)).resolves.toEqual(
      expect.objectContaining({
        screeningMode: 'deep',
        judgeTopN: 2,
      }),
    );

    expect(judge).toHaveBeenCalledTimes(2);
    expect(judge.mock.calls.map((call) => call[3].ruleScore)).toEqual([90, 70]);
    expect(prisma.jobPostActivity.update).toHaveBeenCalledWith({
      where: { application_id: 1 },
      data: expect.objectContaining({
        ai_score: 40,
        ai_raw_result: expect.objectContaining({
          screeningMode: 'deep',
          judgeTopN: 2,
          llmJudgeStatus: 'skipped_not_top_n',
          riskFlags: ['llm_judge_skipped_not_top_n'],
        }),
      }),
    });
  });

  it('defaults Deep Mode judgeTopN to 10', async () => {
    const prisma = createPrisma();
    prisma.jobPostActivity.findMany.mockResolvedValue([
      { application_id: 7, Seeker: {} },
    ] as never);
    prisma.jobPostActivity.update.mockResolvedValue({} as never);
    const service = new AiScreeningService(prisma as never);
    jest.spyOn(service, 'extractJobCriteria').mockResolvedValue(createJobCriteria());
    const judge = jest
      .spyOn(service, 'judgeCandidateWithLLM')
      .mockResolvedValue({
        score: 50,
        recommendation: 'NEEDS_REVIEW',
        summary: 'deep',
        strengths: [],
        concerns: [],
        rawResult: {},
        model: 'qwen2.5:7b + rule-score-v2-dynamic-weights',
        isFallback: false,
      });

    await service.runAiScreeningForJob(1, 20, { mode: 'deep' });

    expect(judge).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      'deep',
      10,
    );
  });

  it('exposes neutral helper fallbacks without changing the current LLM score', () => {
    const service = new AiScreeningService(
      createPrisma() as never,
    ) as RefactoredAiScreeningService;
    const application = { application_id: 7, Seeker: {} };

    const candidateProfile = service.extractCandidateProfile(
      application,
      'candidate document',
    );

    expect(candidateProfile).toEqual(
      expect.objectContaining({
        candidateName: null,
        totalExperience: null,
        mainSkills: [],
        rawCandidateDocument: 'candidate document',
      }),
    );
    expect(service.getExperienceExtraYears('developer', 'senior')).toBe(3);
    expect(service.calculateMaxFit(3, 'developer', 'senior')).toBe(6);
    expect(
      service.calculateRuleScore(createJobCriteria(), candidateProfile),
    ).toEqual(
      expect.objectContaining({
        ruleScore: 0,
        weights: fallbackWeights,
        flags: [],
      }),
    );
      expect(service.calculateFinalScore(80, 60)).toBe(74);
      expect(service.calculateFinalScore(75, 0, 'failed')).toBe(75);
    expect(service.classifyFitLabel(75)).toBe('MATCH');
  });

  it('safely parses AI JSON and clamps scores', () => {
    const service = new AiScreeningService(
      createPrisma() as never,
    ) as RefactoredAiScreeningService;

    expect(service.safeParseAiJson('{"score": 88}')).toEqual({ score: 88 });
    expect(service.safeParseAiJson('not-json')).toBeUndefined();
    expect(service.safeParseAiJson(null)).toBeUndefined();
    expect(service.clampScore(-5)).toBe(0);
    expect(service.clampScore(100.6)).toBe(100);
    expect(service.clampScore('49.5')).toBe(50);
  });

  it('stores AI fields without changing the application status', async () => {
    const prisma = createPrisma();
    prisma.jobPostActivity.findMany.mockResolvedValue([
      {
        application_id: 7,
        status: ApplicationStatus.PENDING,
        Seeker: {},
      },
    ] as never);
    prisma.jobPostActivity.update.mockResolvedValue({} as never);
    const service = new AiScreeningService(prisma as never);
    jest
      .spyOn(service, 'extractJobCriteria')
      .mockResolvedValue(
        createJobCriteria({
          suggestedWeights: {
            ...fallbackWeights,
            mainTechnicalSkillYears: 40,
          },
          weightReasoning: {
            ...createJobCriteria().weightReasoning,
            mainTechnicalSkillYears: 'JD emphasizes TypeScript.',
          },
        }),
      );

    jest.spyOn(service, 'scoreCandidateByContext').mockResolvedValue({
      score: 82,
      recommendation: 'MATCH',
      summary: 'Phu hop',
      strengths: ['TypeScript'],
      concerns: ['Can xem xet them'],
      rawResult: { score: 82 },
      model: 'qwen2.5:7b',
      isFallback: false,
    });

    const response = await service.runAiScreeningForJob(1, 20, {
      limit: 1,
      mode: 'deep',
      judgeTopN: 1,
    });

    expect(prisma.jobPostActivity.update).toHaveBeenCalledWith({
      where: { application_id: 7 },
      data: expect.objectContaining({
        ai_score: 25,
        ai_recommendation: 'LOW_MATCH',
        ai_summary: 'Phu hop',
        ai_screened_by_id: 1,
        ai_model: 'qwen2.5:7b + rule-score-v2-dynamic-weights',
      }),
    });
    const updateData = (
      prisma.jobPostActivity.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      }
    ).data;
    expect(updateData).not.toHaveProperty('status');
    expect(updateData).not.toHaveProperty('current_stage');
    expect(updateData.ai_raw_result).toEqual(
      expect.objectContaining({
        version: 'ai-screening-v2-dynamic-weights',
        ruleScore: expect.any(Number),
        llmScore: 82,
        finalScore: 25,
        scoreBreakdown: expect.any(Object),
        weights: expect.objectContaining({
          mainTechnicalSkillYears: expect.any(Number),
        }),
        weightReasoning: expect.objectContaining({
          mainTechnicalSkillYears: 'JD emphasizes TypeScript.',
        }),
      }),
    );
    expect(response).toEqual(
      expect.objectContaining({
        jobId: 20,
        screenedCount: 1,
        failedCount: 0,
      }),
    );
  });

  it('preserves employee and job ownership checks', async () => {
    const invalidEmployeePrisma = createPrisma();
    invalidEmployeePrisma.employee.findUnique.mockResolvedValue(null as never);
    await expect(
      new AiScreeningService(
        invalidEmployeePrisma as never,
      ).runAiScreeningForJob(1, 20, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const missingJobPrisma = createPrisma();
    missingJobPrisma.jobPost.findUnique.mockResolvedValue(null as never);
    await expect(
      new AiScreeningService(missingJobPrisma as never).runAiScreeningForJob(
        1,
        20,
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    const otherCompanyPrisma = createPrisma();
    otherCompanyPrisma.jobPost.findUnique.mockResolvedValue({
      job_post_id: 20,
      company_id: 99,
    } as never);
    await expect(
      new AiScreeningService(otherCompanyPrisma as never).runAiScreeningForJob(
        1,
        20,
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('builds the same job and candidate context documents', () => {
    const service = new AiScreeningService(createPrisma() as never);
    const jobDocument = service.buildJobDocument({
      job_title: 'Backend Engineer',
      name: 'Backend',
      experience: '3 years',
      Category: { name: 'Engineering' },
      JobType: { job_type: 'Full time' },
      Company: { company_name: 'Acme' },
      JobPostSkill: [{ Skill: { skill_name: 'NestJS' } }],
    });
    const candidateDocument = service.buildCandidateDocument({
      application_id: 7,
      cover_letter: 'Hello',
      Seeker: {
        User: { full_name: 'An', email: 'an@example.com' },
        CvSkill: [{ name: 'TypeScript' }],
        SeekerSkill: [
          { Skill: { skill_name: 'NestJS' }, experience_months: 24 },
        ],
        CvExperience: [
          {
            position: 'Developer',
            company: 'Old Co',
            startDate: '2024-01-01',
            endDate: '2025-01-01',
          },
        ],
        SeekerExperience: [
          {
            job_title: 'Engineer',
            company_name: 'New Co',
            start_date: '2025-01-01',
            is_current_job: true,
          },
        ],
        CvEducation: [{ degree: 'BS', school: 'University' }],
        SeekerEducation: [
          {
            certificate_degree_name: 'Bachelor',
            major: 'CS',
            institute_university_name: 'University',
            cgpa: 3.5,
          },
        ],
        CvCertificate: [{ title: 'AWS', issuer: 'Amazon' }],
        SeekerCertificate: [
          {
            certificate_name: 'IELTS',
            certificate_type: 'Language',
            score: '7.0',
          },
        ],
        CvProject: [{ name: 'API', role: 'Developer' }],
        SeekerProject: [
          {
            project_name: 'Platform',
            technologies: 'NestJS',
          },
        ],
        CvPersonality: [{ type: 'INTJ' }],
        SeekerPersonality: [{ name: 'Careful' }],
        SeekerProfileSummary: { about_me: 'Backend developer' },
      },
    });

    expect(jobDocument).toContain('Tieu de: Backend Engineer');
    expect(jobDocument).toContain('Ky nang gan voi job: NestJS');
    expect(candidateDocument).toContain('Application ID: 7');
    expect(candidateDocument).toContain('Ky nang seeker: NestJS (24 thang)');
    expect(candidateDocument).toContain('2024-01-01 - 2025-01-01');
    expect(candidateDocument).toContain('Backend developer');
  });

  it('keeps the current Ollama request and response normalization', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        response: JSON.stringify({
          score: 101.2,
          recommendation: 'LOW_MATCH',
          summary: '  Tot  ',
          strengths: [' NestJS ', 123, ''],
          concerns: null,
        }),
      },
    });
    const service = new AiScreeningService(createPrisma() as never);

    const result = await service.scoreCandidateByContext('job', 'candidate');

    expect(jest.mocked(axios.post)).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        model: 'qwen2.5:7b',
        format: 'json',
        stream: false,
        options: { temperature: 0.1, num_predict: 500 },
      }),
      {
        timeout: 240_000,
        signal: expect.any(AbortSignal),
      },
    );
    expect(result).toEqual(
      expect.objectContaining({
        score: 100,
        recommendation: 'STRONG_MATCH',
        summary: 'Tot',
        strengths: ['NestJS'],
        concerns: [],
        isFallback: false,
      }),
    );
  });

  it('uses positive timeout environment overrides and ignores invalid values', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        response: JSON.stringify({
          score: 70,
          recommendation: 'MATCH',
          summary: 'OK',
          strengths: [],
          concerns: [],
        }),
      },
    });
    process.env.AI_SCREENING_JUDGE_TIMEOUT_MS = '2500';
    process.env.AI_SCREENING_EXTRACTION_TIMEOUT_MS = '-1';

    try {
      const service = new AiScreeningService(createPrisma() as never);
      await service.scoreCandidateByContext('job', 'candidate');
      await service.extractJobCriteria('JD');

      expect(jest.mocked(axios.post).mock.calls[0][2]).toEqual({
        timeout: 2500,
        signal: expect.any(AbortSignal),
      });
      expect(jest.mocked(axios.post).mock.calls[1][2]).toEqual({
        timeout: 180_000,
        signal: expect.any(AbortSignal),
      });
    } finally {
      delete process.env.AI_SCREENING_JUDGE_TIMEOUT_MS;
      delete process.env.AI_SCREENING_EXTRACTION_TIMEOUT_MS;
    }
  });

  it('clears Ollama abort timers after successful and failed requests', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const post = jest.spyOn(axios, 'post');
    const service = new AiScreeningService(createPrisma() as never);

    post.mockResolvedValueOnce({
      data: {
        response: JSON.stringify({
          score: 70,
          recommendation: 'MATCH',
          summary: 'OK',
          strengths: [],
          concerns: [],
        }),
      },
    });
    await service.scoreCandidateByContext('job', 'candidate');

    post.mockRejectedValueOnce(new Error('offline'));
    await service.extractJobCriteria('JD');

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
  });

  it('judges candidate with dynamic Rule Score context and builds v2 raw result', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        response: JSON.stringify({
          llmScore: 60,
          summary: 'Phù hợp một phần.',
          strengths: ['Có Java'],
          concerns: ['Thiếu domain'],
          riskFlags: ['insufficient_information'],
          recommendation: 'Cần xem xét',
          fitLabel: 'Cần xem xét',
        }),
      },
    });
    const service = new AiScreeningService(createPrisma() as never);
    const jobCriteria = createJobCriteria({
      suggestedWeights: {
        ...fallbackWeights,
        domain: 20,
      },
      weightReasoning: {
        ...createJobCriteria().weightReasoning,
        domain: 'JD ưu tiên banking.',
      },
    });
    const candidateProfile = service.extractCandidateProfile(
      {},
      'Java candidate profile',
      jobCriteria,
    );
    const ruleResult = service.calculateRuleScore(jobCriteria, candidateProfile);
    ruleResult.ruleScore = 80;
    ruleResult.flags = ['possibly_overqualified', 'missing_information'];

    const result = await service.judgeCandidateWithLLM(
      'full JD',
      jobCriteria,
      candidateProfile,
      ruleResult,
    );

    const request = jest.mocked(axios.post).mock.calls[0][1] as {
      prompt: string;
    };
    expect(request.prompt).toContain('Backend đã tính Rule Score');
    expect(request.prompt).toContain('Bạn KHÔNG được thay thế Rule Score');
    expect(request.prompt).toContain('"ruleScore": 80');
    expect(request.prompt).toContain('"domain": 20');
    expect(result).toEqual(
      expect.objectContaining({
        score: 74,
        recommendation: 'MATCH',
        summary: 'Phù hợp một phần.',
        model: 'qwen2.5:7b + rule-score-v2-dynamic-weights',
        isFallback: false,
        rawResult: expect.objectContaining({
          version: 'ai-screening-v2-dynamic-weights',
          jobCriteria,
          candidateProfile,
          weights: ruleResult.weights,
          weightReasoning: ruleResult.weightReasoning,
          ruleScore: 80,
          llmScore: 60,
          finalScore: 74,
          llmJudgeStatus: 'success',
          scoreBreakdown: ruleResult.breakdown,
          flags: ruleResult.flags,
          riskFlags: ['possibly_overqualified', 'insufficient_information'],
          llmJudge: expect.objectContaining({ llmScore: 60 }),
        }),
      }),
    );
  });

  it('persists a rule-based result with llm_judge_failed when Judge is unavailable', async () => {
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('offline'));
    const service = new AiScreeningService(createPrisma() as never);
    const jobCriteria = createJobCriteria();
    const candidateProfile = service.extractCandidateProfile({}, 'candidate');
    const ruleResult = service.calculateRuleScore(jobCriteria, candidateProfile);
    ruleResult.ruleScore = 75;

    const result = await service.judgeCandidateWithLLM(
      'JD',
      jobCriteria,
      candidateProfile,
      ruleResult,
    );

    expect(result).toEqual(
      expect.objectContaining({
        score: 75,
        recommendation: 'MATCH',
        summary:
          'LLM Judge không phản hồi hoặc lỗi, hệ thống sử dụng Rule Score làm điểm cuối.',
        isFallback: false,
        rawResult: expect.objectContaining({
          llmJudgeStatus: 'failed',
          ruleScore: 75,
          llmScore: 75,
          finalScore: 75,
          riskFlags: ['llm_judge_failed'],
          llmJudge: expect.objectContaining({
            errorMessage: 'Không thể gọi AI Screening.',
          }),
        }),
      }),
    );
  });

  it('uses Rule Score as Final Score when Judge returns invalid JSON', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { response: 'invalid-json' },
    });
    const service = new AiScreeningService(createPrisma() as never);
    const jobCriteria = createJobCriteria();
    const candidateProfile = service.extractCandidateProfile({}, 'candidate');
    const ruleResult = service.calculateRuleScore(jobCriteria, candidateProfile);
    ruleResult.ruleScore = 75;

    const result = await service.judgeCandidateWithLLM(
      'JD',
      jobCriteria,
      candidateProfile,
      ruleResult,
    );

    expect(result).toEqual(
      expect.objectContaining({
        score: 75,
        recommendation: 'MATCH',
        rawResult: expect.objectContaining({
          llmJudgeStatus: 'failed',
          ruleScore: 75,
          llmScore: 75,
          finalScore: 75,
          riskFlags: ['llm_judge_failed'],
        }),
      }),
    );
  });

  it('caps LLM score for underqualified candidates and rejects unsupported overqualified flags', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        response: JSON.stringify({
          llmScore: 95,
          summary: 'Ứng viên khá tốt.',
          strengths: [],
          concerns: [],
          riskFlags: ['possibly_overqualified', 'missing_information'],
        }),
      },
    });
    const service = new AiScreeningService(createPrisma() as never);
    const jobCriteria = createJobCriteria();
    const candidateProfile = service.extractCandidateProfile({}, 'candidate');
    const ruleResult = service.calculateRuleScore(jobCriteria, candidateProfile);
    ruleResult.ruleScore = 50;
    ruleResult.flags = ['underqualified', 'missing_information'];

    const result = await service.judgeCandidateWithLLM(
      'JD',
      jobCriteria,
      candidateProfile,
      ruleResult,
    );

    expect(result.rawResult).toEqual(
      expect.objectContaining({
        llmScore: 69,
        riskFlags: ['insufficient_information'],
      }),
    );
    expect(result.score).toBe(56);
  });

  it('returns fallback results for Ollama and parsing failures', async () => {
    const post = jest.spyOn(axios, 'post');
    const service = new AiScreeningService(createPrisma() as never);

    post.mockRejectedValueOnce(new Error('offline'));
    await expect(
      service.scoreCandidateByContext('job', 'candidate'),
    ).resolves.toEqual(
      expect.objectContaining({
        score: 0,
        recommendation: 'LOW_MATCH',
        isFallback: true,
      }),
    );

    post.mockResolvedValueOnce({ data: { response: 'not-json' } });
    await expect(
      service.scoreCandidateByContext('job', 'candidate'),
    ).resolves.toEqual(expect.objectContaining({ isFallback: true }));

    post.mockResolvedValueOnce({ data: { response: '[]' } });
    await expect(
      service.scoreCandidateByContext('job', 'candidate'),
    ).resolves.toEqual(expect.objectContaining({ isFallback: true }));

    post.mockResolvedValueOnce({ data: {} });
    await expect(
      service.scoreCandidateByContext('job', 'candidate'),
    ).resolves.toEqual(expect.objectContaining({ isFallback: true }));
  });

  it('uses defaults for incomplete but valid AI JSON', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        response: JSON.stringify({
          score: 'invalid',
          recommendation: 'LOW_MATCH',
          summary: ' ',
          strengths: 'NestJS',
          concerns: [' Review '],
        }),
      },
    });
    const service = new AiScreeningService(createPrisma() as never);

    await expect(
      service.scoreCandidateByContext('job', 'candidate'),
    ).resolves.toEqual(
      expect.objectContaining({
        score: 0,
        recommendation: 'LOW_MATCH',
        strengths: [],
        concerns: ['Review'],
        isFallback: false,
      }),
    );
  });

  it('stores rule-based screening details when LLM Judge fails', async () => {
    const prisma = createPrisma();
    prisma.jobPostActivity.findMany.mockResolvedValue([
      { application_id: 7, Seeker: {} },
    ] as never);
    prisma.jobPostActivity.update.mockResolvedValue({} as never);
    const service = new AiScreeningService(prisma as never);
    jest
      .spyOn(service, 'extractJobCriteria')
      .mockResolvedValue({ role: 'other' } as never);
    jest.spyOn(service, 'scoreCandidateByContext').mockResolvedValue({
      score: 0,
      recommendation: 'LOW_MATCH',
      summary: 'offline',
      strengths: [],
      concerns: ['offline'],
      rawResult: {},
      model: 'qwen2.5:7b',
      isFallback: true,
      errorMessage: 'offline',
    });

    const result = await service.runAiScreeningForJob(1, 20, {
      mode: 'deep',
      judgeTopN: 1,
    });

    expect(prisma.jobPostActivity.update).toHaveBeenCalledWith({
      where: { application_id: 7 },
      data: expect.objectContaining({
        ai_score: 0,
        ai_recommendation: 'LOW_MATCH',
        ai_model: 'qwen2.5:7b + rule-score-v2-dynamic-weights',
        ai_raw_result: expect.objectContaining({
          version: 'ai-screening-v2-dynamic-weights',
          llmScore: 0,
          llmJudgeStatus: 'failed',
          riskFlags: ['llm_judge_failed'],
        }),
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({ screenedCount: 1, failedCount: 0 }),
    );
  });

  it('uses configured and fallback experience extra years', () => {
    const service = new AiScreeningService(createPrisma() as never);

    expect(service.getExperienceExtraYears('backend', 'fresher')).toBe(0.5);
    expect(service.getExperienceExtraYears('backend', 'senior')).toBe(3);
    expect(service.getExperienceExtraYears('frontend', 'senior')).toBe(2);
    expect(service.getExperienceExtraYears('Frontend', 'fresher')).toBe(0.5);
    expect(service.getExperienceExtraYears('backend', 'Senior')).toBe(3);
    expect(service.getExperienceExtraYears('head_of_product', 'head')).toBeNull();
    expect(service.getExperienceExtraYears('missing_role', 'middle')).toBe(2);
    expect(service.getExperienceExtraYears('backend', 'manager')).toBe(2);
    expect(service.getExperienceExtraYears('backend', 'other')).toBe(2);
  });

  it('calculates maxFit from JD requirement and role-level config', () => {
    const service = new AiScreeningService(createPrisma() as never);

    expect(service.calculateMaxFit(5, 'backend', 'senior')).toBe(8);
    expect(service.calculateMaxFit(5, 'head_of_product', 'head')).toBeNull();
    expect(service.calculateMaxFit(null, 'backend', 'senior')).toBeNull();
    expect(service.calculateMaxFit(0, 'backend', 'senior')).toBeNull();
    expect(service.calculateMaxFit(-1, 'backend', 'senior')).toBeNull();
    expect(service.calculateMaxFit('invalid', 'backend', 'senior')).toBeNull();
  });

  it.each([
    [5, 0.625, 62.5, []],
    [6, 0.75, 75, []],
    [8, 1, 100, []],
    [12, 1, 100, ['possibly_overqualified']],
  ])(
    'scores Senior Backend candidate with %s years',
    (candidateYears, score, scorePercent, flags) => {
      const service = new AiScreeningService(createPrisma() as never);

      expect(
        service.scoreNumericCriterion(
          candidateYears,
          5,
          'backend',
          'senior',
        ),
      ).toEqual({
        score,
        scorePercent,
        candidateValue: candidateYears,
        requiredValue: 5,
        maxFit: 8,
        flags,
      });
    },
  );

  it('handles missing, underqualified, skipped, and uncapped numeric criteria', () => {
    const service = new AiScreeningService(createPrisma() as never);

    expect(
      service.scoreNumericCriterion(null, 5, 'backend', 'senior'),
    ).toEqual({
      score: 0,
      scorePercent: 0,
      candidateValue: null,
      requiredValue: 5,
      maxFit: 8,
      flags: ['missing_information'],
    });
    expect(service.scoreNumericCriterion(2, 5, 'backend', 'senior')).toEqual({
      score: 0.25,
      scorePercent: 25,
      candidateValue: 2,
      requiredValue: 5,
      maxFit: 8,
      flags: ['underqualified'],
    });
    expect(service.scoreNumericCriterion(3, null, 'backend', 'senior')).toEqual({
      score: null,
      scorePercent: null,
      candidateValue: 3,
      requiredValue: null,
      maxFit: null,
      flags: [],
    });
    expect(
      service.scoreNumericCriterion(4, 5, 'head_of_product', 'head'),
    ).toEqual({
      score: 0.8,
      scorePercent: 80,
      candidateValue: 4,
      requiredValue: 5,
      maxFit: null,
      flags: ['underqualified'],
    });
    expect(
      service.scoreNumericCriterion(7, 5, 'head_of_product', 'head'),
    ).toEqual({
      score: 1,
      scorePercent: 100,
      candidateValue: 7,
      requiredValue: 5,
      maxFit: null,
      flags: [],
    });
  });

  it('normalizes dynamic JD weights to 100 and falls back for invalid input', () => {
    const service = new AiScreeningService(
      createPrisma() as never,
    ) as RefactoredAiScreeningService;

    const normalized = service.normalizeWeights({
      totalExperience: 5,
      mainTechnicalSkillYears: 40,
      apiOrCoreSkillYears: 15,
      requiredSkills: 15,
      preferredSkills: 5,
      domain: 10,
      englishEducationCertificate: 5,
      projectContest: 5,
    });

    expect(normalized).toEqual({
      totalExperience: 5,
      mainTechnicalSkillYears: 40,
      apiOrCoreSkillYears: 15,
      requiredSkills: 15,
      preferredSkills: 5,
      domain: 10,
      englishEducationCertificate: 5,
      projectContest: 5,
    });
    expect(Object.values(normalized).reduce((sum, value) => sum + value, 0)).toBe(
      100,
    );
    expect(service.normalizeWeights()).toEqual(fallbackWeights);
    expect(
      service.normalizeWeights({
        totalExperience: Number.NaN,
        mainTechnicalSkillYears: Number.POSITIVE_INFINITY,
      }),
    ).toEqual(fallbackWeights);
  });

  it('distributes rounding differences while preserving normalized weight limits', () => {
    const service = new AiScreeningService(
      createPrisma() as never,
    ) as RefactoredAiScreeningService;

    const normalized = service.normalizeWeights({
      totalExperience: 1,
      mainTechnicalSkillYears: 1,
      apiOrCoreSkillYears: 1,
      requiredSkills: 1,
      preferredSkills: 1,
      domain: 1,
      englishEducationCertificate: 1,
      projectContest: 1,
    });

    expect(normalized.requiredSkills).toBe(13);
    expect(Object.values(normalized).reduce((sum, value) => sum + value, 0)).toBe(
      100,
    );
    expect(Math.max(...Object.values(normalized))).toBeLessThanOrEqual(40);
  });

  it('keeps normalized weights at exactly 100 when requiredSkills cannot absorb a negative diff', () => {
    const service = new AiScreeningService(
      createPrisma() as never,
    ) as RefactoredAiScreeningService;

    const normalized = service.normalizeWeights({
      totalExperience: 1,
      mainTechnicalSkillYears: 1,
      apiOrCoreSkillYears: 1,
      requiredSkills: 0,
      preferredSkills: 1,
      domain: 1,
      englishEducationCertificate: 1,
      projectContest: 0,
    });

    expect(Object.values(normalized).reduce((sum, value) => sum + value, 0)).toBe(
      100,
    );
    expect(Math.max(...Object.values(normalized))).toBeLessThanOrEqual(40);
    expect(Object.values(normalized).every((value) => value >= 0)).toBe(true);
  });

  it('does not penalize Rule Score for criteria that the JD does not require', () => {
    const service = new AiScreeningService(
      createPrisma() as never,
    ) as RefactoredAiScreeningService;
    const criteria = createJobCriteria({
      requiredYears: {
        totalExperience: null,
        mainSkillYears: 5,
        apiYears: null,
        domainYears: null,
      },
      suggestedWeights: fallbackWeights,
    });
    const candidateProfile = {
      ...service.extractCandidateProfile({}, 'NestJS candidate'),
      mainSkillYears: 8,
    };

    expect(service.calculateRuleScore(criteria, candidateProfile).ruleScore).toBe(
      100,
    );
  });

  it('calculates Rule Score with normalized JD weights and exposes its breakdown', () => {
    const service = new AiScreeningService(
      createPrisma() as never,
    ) as RefactoredAiScreeningService;
    const weightReasoning = {
      ...createJobCriteria().weightReasoning,
      mainTechnicalSkillYears: 'Java is central to the JD.',
      domain: 'Banking experience is mandatory.',
    };
    const jobCriteria = createJobCriteria({
      requiredYears: {
        totalExperience: null,
        mainSkillYears: 5,
        apiYears: null,
        domainYears: null,
      },
      mainSkillKeywords: ['Java'],
      requiredSkills: ['Java', 'Spring Boot'],
      domain: 'banking',
      suggestedWeights: {
        totalExperience: 0,
        mainTechnicalSkillYears: 40,
        apiOrCoreSkillYears: 0,
        requiredSkills: 20,
        preferredSkills: 0,
        domain: 40,
        englishEducationCertificate: 0,
        projectContest: 0,
      },
      weightReasoning,
    });
    const candidateProfile = {
      ...service.extractCandidateProfile({}, 'Java banking candidate'),
      mainSkillYears: 5,
      mainSkills: ['Java'],
      domainExperience: 'banking payments',
    };

    const result = service.calculateRuleScore(jobCriteria, candidateProfile);

    expect(result).toEqual(
      expect.objectContaining({
        ruleScore: 75,
        weights: jobCriteria.suggestedWeights,
        weightReasoning,
        flags: ['underqualified'],
        breakdown: expect.objectContaining({
          mainTechnicalSkillYears: expect.objectContaining({ score: 0.625 }),
          requiredSkills: expect.objectContaining({
            score: 0.5,
            matched: ['Java'],
          }),
          domain: expect.objectContaining({ score: 1 }),
        }),
      }),
    );
  });

  it('changes Rule Score when the same candidate is evaluated with different JD weights', () => {
    const service = new AiScreeningService(
      createPrisma() as never,
    ) as RefactoredAiScreeningService;
    const candidateProfile = {
      ...service.extractCandidateProfile({}, 'Java candidate'),
      mainSkillYears: 5,
      mainSkills: ['Java'],
      domainExperience: null,
    };
    const criteria = createJobCriteria({
      requiredYears: {
        totalExperience: null,
        mainSkillYears: 5,
        apiYears: null,
        domainYears: null,
      },
      mainSkillKeywords: ['Java'],
      domain: 'banking',
    });
    const technicalHeavy = service.calculateRuleScore(
      {
        ...criteria,
        suggestedWeights: {
          ...criteria.suggestedWeights,
          mainTechnicalSkillYears: 40,
          domain: 0,
        },
      },
      candidateProfile,
    );
    const domainHeavy = service.calculateRuleScore(
      {
        ...criteria,
        suggestedWeights: {
          ...criteria.suggestedWeights,
          mainTechnicalSkillYears: 0,
          domain: 40,
        },
      },
      candidateProfile,
    );

    expect(technicalHeavy.ruleScore).toBeGreaterThan(domainHeavy.ruleScore);
  });

  it('keeps fit label and score clamping boundaries', () => {
    const service = new AiScreeningService(createPrisma() as never);

    expect(service.classifyFitLabel(85)).toBe('STRONG_MATCH');
    expect(service.classifyFitLabel(70)).toBe('MATCH');
    expect(service.classifyFitLabel(50)).toBe('NEEDS_REVIEW');
    expect(service.classifyFitLabel(49)).toBe('LOW_MATCH');
    expect(service.clampScore(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('continues when processing or fallback debug persistence fails', async () => {
    const processingPrisma = createPrisma();
    processingPrisma.jobPostActivity.findMany.mockResolvedValue([
      { application_id: 7, Seeker: {} },
    ] as never);
    const processingService = new AiScreeningService(processingPrisma as never);
    jest
      .spyOn(processingService, 'extractJobCriteria')
      .mockResolvedValue({ role: 'other' } as never);
    jest
      .spyOn(processingService, 'scoreCandidateByContext')
      .mockRejectedValue(new Error('processing failed'));

    await expect(
      processingService.runAiScreeningForJob(1, 20, {
        mode: 'deep',
        judgeTopN: 1,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ screenedCount: 0, failedCount: 1 }),
    );

    const fallbackPrisma = createPrisma();
    fallbackPrisma.jobPostActivity.findMany.mockResolvedValue([
      { application_id: 8, Seeker: {} },
    ] as never);
    fallbackPrisma.jobPostActivity.update.mockRejectedValue(
      new Error('write failed'),
    );
    const fallbackService = new AiScreeningService(fallbackPrisma as never);
    jest
      .spyOn(fallbackService, 'extractJobCriteria')
      .mockResolvedValue({ role: 'other' } as never);
    jest.spyOn(fallbackService, 'scoreCandidateByContext').mockResolvedValue({
      score: 0,
      recommendation: 'LOW_MATCH',
      summary: 'offline',
      strengths: [],
      concerns: ['offline'],
      rawResult: {},
      model: 'qwen2.5:7b',
      isFallback: true,
    });

    await expect(
      fallbackService.runAiScreeningForJob(1, 20, {
        mode: 'deep',
        judgeTopN: 1,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ screenedCount: 0, failedCount: 1 }),
    );
  });

  it('extracts normalized job criteria from JD only', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        response: JSON.stringify({
          role: 'backend',
          level: 'senior',
          requiredYears: {
            totalExperience: 5,
            mainSkillYears: 3,
            apiYears: 3,
            domainYears: 2,
          },
          mainSkillKeywords: [' Java ', 'Spring Boot'],
          apiOrCoreSkillKeywords: ['REST API'],
          requiredSkills: ['Java', 'Oracle'],
          preferredSkills: ['Docker'],
          domain: ' banking ',
          englishRequirement: 'reading_writing_mandatory',
          educationRequirement: 'Bachelor',
          certificates: [],
          projectKeywords: ['fintech'],
          suggestedWeights: {
            totalExperience: 10,
            mainTechnicalSkillYears: 25,
            apiOrCoreSkillYears: 20,
            requiredSkills: 15,
            preferredSkills: 10,
            domain: 15,
            englishEducationCertificate: 3,
            projectContest: 2,
          },
          weightReasoning: {
            totalExperience: 'JD requires five years.',
            mainTechnicalSkillYears: 'Java and Spring are emphasized.',
            apiOrCoreSkillYears: 'REST APIs are central.',
            requiredSkills: 'Several mandatory skills.',
            preferredSkills: 'Nice-to-have skills matter less.',
            domain: 'Banking experience is important.',
            englishEducationCertificate: 'English is lightly required.',
            projectContest: 'Projects are optional.',
          },
        }),
      },
    });
    const service = new AiScreeningService(createPrisma() as never);

    const result = await service.extractJobCriteria('JD CONTENT ONLY');

    expect(result).toEqual({
      role: 'backend',
      level: 'senior',
      requiredYears: {
        totalExperience: 5,
        mainSkillYears: 3,
        apiYears: 3,
        domainYears: 2,
      },
      mainSkillKeywords: ['Java', 'Spring Boot'],
      apiOrCoreSkillKeywords: ['REST API'],
      requiredSkills: ['Java', 'Oracle'],
      preferredSkills: ['Docker'],
      domain: 'banking',
      englishRequirement: 'reading_writing_mandatory',
      educationRequirement: 'Bachelor',
      certificates: [],
      projectKeywords: ['fintech'],
      suggestedWeights: {
        totalExperience: 10,
        mainTechnicalSkillYears: 25,
        apiOrCoreSkillYears: 20,
        requiredSkills: 15,
        preferredSkills: 10,
        domain: 15,
        englishEducationCertificate: 3,
        projectContest: 2,
      },
      weightReasoning: {
        totalExperience: 'JD requires five years.',
        mainTechnicalSkillYears: 'Java and Spring are emphasized.',
        apiOrCoreSkillYears: 'REST APIs are central.',
        requiredSkills: 'Several mandatory skills.',
        preferredSkills: 'Nice-to-have skills matter less.',
        domain: 'Banking experience is important.',
        englishEducationCertificate: 'English is lightly required.',
        projectContest: 'Projects are optional.',
      },
    });
    const request = jest.mocked(axios.post).mock.calls[0][1] as {
      prompt: string;
    };
    expect(request.prompt).toContain('JD CONTENT ONLY');
    expect(request.prompt).toContain('KHÔNG được chấm điểm ứng viên.');
    expect(request.prompt).toContain('KHÔNG được tính Rule Score');
    expect(request.prompt).toContain('KHÔNG được tính Final Score');
    expect(request.prompt).toContain('Tổng suggestedWeights phải bằng 100');
    expect(request.prompt).toContain('Không nhóm nào vượt quá 40 điểm');
    expect(request.prompt).not.toContain('CV ứng viên:');
    expect(request).toEqual(
      expect.objectContaining({
        model: 'qwen2.5:7b',
        format: 'json',
        stream: false,
        options: { temperature: 0.1, num_predict: 900 },
      }),
    );
    expect(jest.mocked(axios.post).mock.calls[0][2]).toEqual({
      timeout: 180_000,
      signal: expect.any(AbortSignal),
    });
  });

  it('normalizes invalid job criteria fields', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        response: JSON.stringify({
          role: 'wizard',
          level: 'principal',
          requiredYears: {
            totalExperience: '5',
            mainSkillYears: -2,
            apiYears: 'invalid',
            domainYears: true,
          },
          mainSkillKeywords: [' Java ', 1, ''],
          requiredSkills: 'Java',
          domain: ' ',
          englishRequirement: 123,
          certificates: [' AWS '],
          suggestedWeights: {
            totalExperience: '12',
            mainTechnicalSkillYears: -5,
            apiOrCoreSkillYears: 'invalid',
            requiredSkills: 50,
          },
          weightReasoning: {
            totalExperience: ' Experience ',
            mainTechnicalSkillYears: 123,
          },
        }),
      },
    });
    const service = new AiScreeningService(createPrisma() as never);

    await expect(service.extractJobCriteria('JD')).resolves.toEqual({
      role: 'other',
      level: 'other',
      requiredYears: {
        totalExperience: 5,
        mainSkillYears: null,
        apiYears: null,
        domainYears: null,
      },
      mainSkillKeywords: ['Java'],
      apiOrCoreSkillKeywords: [],
      requiredSkills: ['Java'],
      preferredSkills: [],
      domain: null,
      englishRequirement: null,
      educationRequirement: null,
      certificates: ['AWS'],
      projectKeywords: [],
      suggestedWeights: {
        totalExperience: 12,
        mainTechnicalSkillYears: 0,
        apiOrCoreSkillYears: 0,
        requiredSkills: 40,
        preferredSkills: 12,
        domain: 12,
        englishEducationCertificate: 12,
        projectContest: 12,
      },
      weightReasoning: {
        totalExperience: 'Experience',
        mainTechnicalSkillYears: '',
        apiOrCoreSkillYears: '',
        requiredSkills: '',
        preferredSkills: '',
        domain: '',
        englishEducationCertificate: '',
        projectContest: '',
      },
    });
  });

  it('rejects implausible JD years and enriches missing required criteria from the JD text', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        response: JSON.stringify({
          role: 'backend',
          level: 'senior',
          requiredYears: {
            totalExperience: null,
            mainSkillYears: 50,
            apiYears: 30,
            domainYears: 10,
          },
          mainSkillKeywords: ['NestJS'],
          apiOrCoreSkillKeywords: [],
          requiredSkills: [],
          preferredSkills: [],
          domain: null,
          suggestedWeights: fallbackWeights,
        }),
      },
    });
    const service = new AiScreeningService(createPrisma() as never);

    const criteria = await service.extractJobCriteria(
      'Yeu cau ung vien: 5+ nam kinh nghiem NestJS\nCo kinh nghiem thiet ke REST API',
    );

    expect(criteria.requiredYears).toEqual({
      totalExperience: 5,
      mainSkillYears: 5,
      apiYears: null,
      domainYears: null,
    });
    expect(criteria.apiOrCoreSkillKeywords).toContain('REST API');
    expect(criteria.requiredSkills).toEqual(
      expect.arrayContaining(['NestJS', 'REST API']),
    );
  });

  it('uses balanced weights when valid JD criteria omit suggestedWeights', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        response: JSON.stringify({
          role: 'frontend',
          level: 'middle',
          weightReasoning: {
            mainTechnicalSkillYears: 'React is emphasized.',
          },
        }),
      },
    });
    const service = new AiScreeningService(createPrisma() as never);

    await expect(service.extractJobCriteria('JD')).resolves.toEqual(
      expect.objectContaining({
        suggestedWeights: {
          totalExperience: 13,
          mainTechnicalSkillYears: 13,
          apiOrCoreSkillYears: 13,
          requiredSkills: 13,
          preferredSkills: 12,
          domain: 12,
          englishEducationCertificate: 12,
          projectContest: 12,
        },
        weightReasoning: {
          totalExperience: '',
          mainTechnicalSkillYears: 'React is emphasized.',
          apiOrCoreSkillYears: '',
          requiredSkills: '',
          preferredSkills: '',
          domain: '',
          englishEducationCertificate: '',
          projectContest: '',
        },
      }),
    );
  });

  it('falls back safely when JD extraction fails', async () => {
    const post = jest.spyOn(axios, 'post');
    const service = new AiScreeningService(createPrisma() as never);
    const fallback = {
      role: 'other',
      level: 'other',
      requiredYears: {
        totalExperience: null,
        mainSkillYears: null,
        apiYears: null,
        domainYears: null,
      },
      mainSkillKeywords: [],
      apiOrCoreSkillKeywords: [],
      requiredSkills: [],
      preferredSkills: [],
      domain: null,
      englishRequirement: null,
      educationRequirement: null,
      certificates: [],
      projectKeywords: [],
      suggestedWeights: {
        totalExperience: 13,
        mainTechnicalSkillYears: 13,
        apiOrCoreSkillYears: 13,
        requiredSkills: 13,
        preferredSkills: 12,
        domain: 12,
        englishEducationCertificate: 12,
        projectContest: 12,
      },
      weightReasoning: {
        totalExperience: '',
        mainTechnicalSkillYears: '',
        apiOrCoreSkillYears: '',
        requiredSkills: '',
        preferredSkills: '',
        domain: '',
        englishEducationCertificate: '',
        projectContest: '',
      },
    };

    post.mockRejectedValueOnce(new Error('offline'));
    await expect(service.extractJobCriteria('JD')).resolves.toEqual(fallback);
    post.mockResolvedValueOnce({ data: { response: 'not-json' } });
    await expect(service.extractJobCriteria('JD')).resolves.toEqual(fallback);
    post.mockResolvedValueOnce({ data: { response: '[]' } });
    await expect(service.extractJobCriteria('JD')).resolves.toEqual(fallback);
    post.mockResolvedValueOnce({ data: {} });
    await expect(service.extractJobCriteria('JD')).resolves.toEqual(fallback);
  });

  it('builds useful fallback criteria from JD text when Ollama fails', async () => {
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('offline'));
    const service = new AiScreeningService(createPrisma() as never);

    await expect(
      service.extractJobCriteria(
        'Senior Backend Developer\nYeu cau 5+ nam kinh nghiem NestJS va thiet ke REST API',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        role: 'backend',
        level: 'senior',
        requiredYears: {
          totalExperience: 5,
          mainSkillYears: 5,
          apiYears: null,
          domainYears: null,
        },
        mainSkillKeywords: ['NestJS'],
        apiOrCoreSkillKeywords: ['REST API'],
        requiredSkills: ['NestJS', 'REST API'],
        suggestedWeights: {
          totalExperience: 13,
          mainTechnicalSkillYears: 13,
          apiOrCoreSkillYears: 13,
          requiredSkills: 13,
          preferredSkills: 12,
          domain: 12,
          englishEducationCertificate: 12,
          projectContest: 12,
        },
      }),
    );
  });

  it('extracts JD once and reuses the same criteria for every candidate', async () => {
    const prisma = createPrisma();
    prisma.jobPostActivity.findMany.mockResolvedValue([
      { application_id: 7, Seeker: {} },
      { application_id: 8, Seeker: {} },
    ] as never);
    prisma.jobPostActivity.update.mockResolvedValue({} as never);
    const service = new AiScreeningService(prisma as never);
    const criteria = {
      role: 'backend',
      level: 'senior',
      requiredYears: {
        totalExperience: 5,
        mainSkillYears: null,
        apiYears: null,
        domainYears: null,
      },
      mainSkillKeywords: ['Java'],
      apiOrCoreSkillKeywords: [],
      requiredSkills: [],
      preferredSkills: [],
      domain: null,
      englishRequirement: null,
      educationRequirement: null,
      certificates: [],
      projectKeywords: [],
    } as const;
    const extract = jest
      .spyOn(service, 'extractJobCriteria')
      .mockResolvedValue(criteria as never);
    const calculateRuleScore = jest.spyOn(service, 'calculateRuleScore');
    const extractCandidateProfile = jest.spyOn(
      service,
      'extractCandidateProfile',
    );
    const scoreCandidate = jest
      .spyOn(service, 'scoreCandidateByContext')
      .mockResolvedValue({
        score: 70,
        recommendation: 'MATCH',
        summary: 'ok',
        strengths: [],
        concerns: [],
        rawResult: {},
        model: 'qwen2.5:7b',
        isFallback: false,
      });

    await service.runAiScreeningForJob(1, 20, {
      mode: 'deep',
      judgeTopN: 2,
    });

    expect(extract).toHaveBeenCalledTimes(1);
    expect(calculateRuleScore).toHaveBeenCalledTimes(2);
    expect(calculateRuleScore.mock.calls[0][0]).toBe(criteria);
    expect(calculateRuleScore.mock.calls[1][0]).toBe(criteria);
    expect(extractCandidateProfile).toHaveBeenCalledTimes(2);
    expect(extractCandidateProfile.mock.calls[0][2]).toBe(criteria);
    expect(extractCandidateProfile.mock.calls[1][2]).toBe(criteria);
    expect(scoreCandidate).toHaveBeenCalledTimes(2);
    expect(scoreCandidate.mock.calls[0][0]).toContain('Tieu de');
  });

  it('caches JD criteria after a miss and reuses it on the next run', async () => {
    const prisma = createPrisma();
    prisma.jobPostActivity.findMany.mockResolvedValue([
      { application_id: 7, Seeker: {} },
    ] as never);
    prisma.jobPostActivity.update.mockResolvedValue({} as never);
    const criteria = createJobCriteria({
      suggestedWeights: {
        totalExperience: 10,
        mainTechnicalSkillYears: 25,
        apiOrCoreSkillYears: 20,
        requiredSkills: 15,
        preferredSkills: 10,
        domain: 15,
        englishEducationCertificate: 3,
        projectContest: 2,
      },
    });
    prisma.jobAiCriteriaCache.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ jobCriteria: criteria } as never);
    const service = new AiScreeningService(prisma as never);
    const extract = jest
      .spyOn(service, 'extractJobCriteria')
      .mockResolvedValue(criteria);

    await service.runAiScreeningForJob(1, 20, { force: true });
    await service.runAiScreeningForJob(1, 20, { force: true });

    expect(extract).toHaveBeenCalledTimes(1);
    expect(prisma.jobAiCriteriaCache.upsert).toHaveBeenCalledTimes(1);
    const rawResults = prisma.jobPostActivity.update.mock.calls.map(
      ([input]) => input.data.ai_raw_result,
    );
    expect(rawResults[0]).toEqual(
      expect.objectContaining({ jobCriteriaCache: 'miss' }),
    );
    expect(rawResults[1]).toEqual(
      expect.objectContaining({
        jobCriteriaCache: 'hit',
        jobCriteria: expect.objectContaining({
          suggestedWeights: expect.objectContaining({
            mainTechnicalSkillYears: 25,
          }),
        }),
      }),
    );
    expect(
      Object.values(rawResults[1].weights).reduce(
        (sum: number, value) => sum + Number(value),
        0,
      ),
    ).toBe(100);
  });

  it('extracts JD again when the job document changes', async () => {
    const prisma = createPrisma();
    prisma.jobPostActivity.findMany.mockResolvedValue([
      { application_id: 7, Seeker: {} },
    ] as never);
    prisma.jobPostActivity.update.mockResolvedValue({} as never);
    const service = new AiScreeningService(prisma as never);
    jest
      .spyOn(service, 'buildJobDocument')
      .mockReturnValueOnce('JD version A')
      .mockReturnValueOnce('JD version B');
    const extract = jest
      .spyOn(service, 'extractJobCriteria')
      .mockResolvedValue(createJobCriteria());

    await service.runAiScreeningForJob(1, 20, { force: true });
    await service.runAiScreeningForJob(1, 20, { force: true });

    expect(extract).toHaveBeenCalledTimes(2);
    const cacheKeys = prisma.jobAiCriteriaCache.findUnique.mock.calls.map(
      ([input]) => input.where.jobPostId_jobDocumentHash_modelVersion_promptVersion,
    );
    expect(cacheKeys[0].jobDocumentHash).not.toBe(
      cacheKeys[1].jobDocumentHash,
    );
  });

  it('extracts candidate profile from PostgreSQL-backed relations', () => {
    const post = jest.spyOn(axios, 'post');
    const service = new AiScreeningService(createPrisma() as never);
    const jobCriteria = {
      role: 'backend',
      level: 'senior',
      requiredYears: {
        totalExperience: 5,
        mainSkillYears: 3,
        apiYears: 2,
        domainYears: 1,
      },
      mainSkillKeywords: ['Java', 'Spring Boot'],
      apiOrCoreSkillKeywords: ['REST API', 'OpenAPI'],
      requiredSkills: [],
      preferredSkills: [],
      domain: 'banking',
      englishRequirement: 'IELTS',
      educationRequirement: 'Bachelor',
      certificates: [],
      projectKeywords: [],
    } satisfies JobCriteria;
    const application = {
      cover_letter: 'I enjoy payment platforms.',
      Seeker: {
        User: { full_name: 'Nguyen Van An' },
        CvSkill: [{ name: 'Docker' }],
        SeekerSkill: [
          { Skill: { skill_name: 'Java' }, experience_months: 48 },
          { Skill: { skill_name: 'Spring Boot' }, experience_months: 36 },
          { Skill: { skill_name: 'REST API' }, experience_months: 24 },
        ],
        CvExperience: [
          {
            position: 'Backend Developer',
            company: 'Bank A',
            startDate: '2020-01-01',
            endDate: '2022-01-01',
            description: 'Built banking REST API services',
          },
        ],
        SeekerExperience: [
          {
            job_title: 'Senior Backend Developer',
            company_name: 'Fintech B',
            start_date: '2022-01-01',
            end_date: '2024-01-01',
            description: 'Payment and online banking platform',
          },
        ],
        CvEducation: [
          { degree: 'Bachelor', major: 'Computer Science', school: 'DUT' },
        ],
        SeekerEducation: [],
        CvCertificate: [
          { title: 'AWS Certified Developer', issuer: 'AWS' },
        ],
        SeekerCertificate: [
          {
            certificate_name: 'IELTS',
            certificate_type: 'English',
            issuing_organization: 'British Council',
            score: '7.5',
          },
          {
            certificate_name: 'Hackathon Winner',
            certificate_type: 'Award',
          },
        ],
        CvProject: [
          {
            name: 'OpenAPI Gateway',
            role: 'Developer',
            description: 'REST API for fintech payments',
          },
        ],
        SeekerProject: [
          {
            project_name: 'Banking Platform',
            role: 'Lead',
            technologies: 'Java, Spring Boot',
            project_description: 'Online banking and payment',
          },
        ],
        CvPersonality: [],
        SeekerPersonality: [],
        SeekerProfileSummary: {
          strengths: 'Problem solving, Team leadership',
          career_objective: 'Become a backend architect',
          about_me: 'Winner of university coding competition',
        },
      },
    };

    const profile = service.extractCandidateProfile(
      application,
      'RAW CANDIDATE DOCUMENT',
      jobCriteria,
    );

    expect(profile).toEqual({
      candidateName: 'Nguyen Van An',
      totalExperience: 4,
      mainSkillYears: 3,
      apiYears: 2,
      domainYears: 4,
      mainSkills: ['Docker', 'Java', 'Spring Boot', 'REST API'],
      skillYears: {
        Java: 4,
        'Spring Boot': 3,
        'REST API': 2,
      },
      education: 'Bachelor - Computer Science - DUT',
      certificates: [
        'AWS Certified Developer - AWS',
        'IELTS - English - British Council - 7.5',
        'Hackathon Winner - Award',
      ],
      projects: [
        'OpenAPI Gateway - Developer - REST API for fintech payments',
        'Banking Platform - Lead - Java, Spring Boot - Online banking and payment',
      ],
      contests: [
        'Hackathon Winner - Award',
        'Winner of university coding competition',
      ],
      coverLetter: 'I enjoy payment platforms.',
      strengths: ['Problem solving', 'Team leadership'],
      careerGoals: 'Become a backend architect',
      domainExperience:
        'Bank A - Built banking REST API services; Fintech B - Payment and online banking platform; OpenAPI Gateway - Developer - REST API for fintech payments; Banking Platform - Lead - Java, Spring Boot - Online banking and payment',
      englishScore: 7.5,
      englishEvidence: 'IELTS - English - British Council - 7.5',
      rawCandidateDocument: 'RAW CANDIDATE DOCUMENT',
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('does not double count overlapping experience periods', () => {
    const service = new AiScreeningService(createPrisma() as never);
    const application = {
      Seeker: {
        User: {},
        CvExperience: [
          { startDate: '2020-01-01', endDate: '2022-01-01' },
        ],
        SeekerExperience: [
          { start_date: '2021-01-01', end_date: '2023-01-01' },
        ],
      },
    };

    expect(
      service.extractCandidateProfile(application, 'raw'),
    ).toEqual(
      expect.objectContaining({
        totalExperience: 3,
        mainSkillYears: null,
        apiYears: null,
        domainYears: null,
      }),
    );
  });

  it('uses dated projects as API and domain experience evidence', () => {
    const service = new AiScreeningService(createPrisma() as never);
    const application = {
      Seeker: {
        User: {},
        CvProject: [
          {
            name: 'Fintech API',
            description: 'REST API payment platform',
            startDate: '2020-01-01',
            endDate: '2022-01-01',
          },
        ],
      },
    };

    expect(
      service.extractCandidateProfile(application, 'raw', {
        role: 'backend',
        level: 'middle',
        requiredYears: {
          totalExperience: null,
          mainSkillYears: null,
          apiYears: null,
          domainYears: null,
        },
        mainSkillKeywords: [],
        apiOrCoreSkillKeywords: ['REST API'],
        requiredSkills: [],
        preferredSkills: [],
        domain: 'banking',
        englishRequirement: null,
        educationRequirement: null,
        certificates: [],
        projectKeywords: [],
      }),
    ).toEqual(
      expect.objectContaining({
        totalExperience: null,
        apiYears: 2,
        domainYears: 2,
      }),
    );
  });

  it('returns safe empty candidate profile for sparse applications', () => {
    const service = new AiScreeningService(createPrisma() as never);

    expect(service.extractCandidateProfile({}, '')).toEqual({
      candidateName: null,
      totalExperience: null,
      mainSkillYears: null,
      apiYears: null,
      domainYears: null,
      mainSkills: [],
      skillYears: {},
      education: null,
      certificates: [],
      projects: [],
      contests: [],
      coverLetter: null,
      strengths: [],
      careerGoals: null,
      domainExperience: null,
      englishScore: null,
      englishEvidence: null,
      rawCandidateDocument: '',
    });
  });
});

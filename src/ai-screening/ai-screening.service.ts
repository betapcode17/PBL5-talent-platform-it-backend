import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { createHash } from 'node:crypto';
import { ApplicationStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import {
  EXPERIENCE_EXTRA_YEARS_CONFIG,
  EXPERIENCE_EXTRA_YEARS_LEVEL_FALLBACK,
} from './ai-screening.config.js';
import { RunAiScreeningDto } from './dto/run-ai-screening.dto.js';

export type AiScreeningRecommendation =
  | 'STRONG_MATCH'
  | 'MATCH'
  | 'NEEDS_REVIEW'
  | 'LOW_MATCH';

export interface AiScreeningResult {
  score: number;
  recommendation: AiScreeningRecommendation;
  summary: string;
  strengths: string[];
  concerns: string[];
  rawResult: Record<string, any>;
  model: string;
  isFallback: boolean;
  errorMessage?: string;
}

type OllamaGenerateResponse = {
  response?: unknown;
};

type AiScreeningResponseItem = {
  applicationId: number;
  score: number;
  ruleScore: number;
  llmScore: number;
  finalScore: number;
  recommendation: AiScreeningRecommendation;
  llmJudgeStatus: LlmJudgeStatus;
  riskFlags: string[];
  summary: string;
  strengths: string[];
  concerns: string[];
};

type AiScreeningErrorItem = {
  applicationId: number;
  message: string;
};

type ScreeningMode = 'fast' | 'deep';
type LlmJudgeStatus =
  | 'success'
  | 'failed'
  | 'skipped_fast_mode'
  | 'skipped_not_top_n';

const JOB_ROLES = [
  'backend',
  'frontend',
  'fullstack',
  'mobile',
  'devops',
  'cloud_platform',
  'qa_manual',
  'qa_automation',
  'data_analyst',
  'data_engineer',
  'ai_ml_engineer',
  'mlops_ai_lead',
  'business_analyst',
  'product_owner',
  'product_manager',
  'head_of_product',
  'ui_ux',
  'other',
] as const;

const JOB_LEVELS = [
  'intern',
  'fresher',
  'junior',
  'middle',
  'senior',
  'lead',
  'manager',
  'architect',
  'head',
  'other',
] as const;

type JobRole = (typeof JOB_ROLES)[number];
type JobLevel = (typeof JOB_LEVELS)[number];

const WEIGHT_KEYS = [
  'totalExperience',
  'mainTechnicalSkillYears',
  'apiOrCoreSkillYears',
  'requiredSkills',
  'preferredSkills',
  'domain',
  'englishEducationCertificate',
  'projectContest',
] as const;

type WeightKey = (typeof WEIGHT_KEYS)[number];
export type SuggestedWeights = Record<WeightKey, number>;
export type WeightReasoning = Record<WeightKey, string>;

const WEIGHT_LABELS: Record<WeightKey, string> = {
  totalExperience: 'tổng kinh nghiệm',
  mainTechnicalSkillYears: 'kinh nghiệm kỹ năng chính',
  apiOrCoreSkillYears: 'API / kỹ năng cốt lõi',
  requiredSkills: 'kỹ năng bắt buộc',
  preferredSkills: 'kỹ năng ưu tiên',
  domain: 'lĩnh vực nghiệp vụ',
  englishEducationCertificate: 'ngoại ngữ / học vấn / chứng chỉ',
  projectContest: 'dự án / cuộc thi / portfolio',
};

export type JobCriteria = {
  role: JobRole;
  level: JobLevel;
  requiredYears: {
    totalExperience: number | null;
    mainSkillYears: number | null;
    apiYears: number | null;
    domainYears: number | null;
  };
  mainSkillKeywords: string[];
  apiOrCoreSkillKeywords: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  domain: string | null;
  englishRequirement: string | null;
  educationRequirement: string | null;
  certificates: string[];
  projectKeywords: string[];
  suggestedWeights: SuggestedWeights;
  weightReasoning: WeightReasoning;
};

export type CandidateProfile = {
  candidateName: string | null;
  totalExperience: number | null;
  mainSkillYears: number | null;
  apiYears: number | null;
  domainYears: number | null;
  mainSkills: string[];
  skillYears: Record<string, number>;
  education: string | null;
  certificates: string[];
  projects: string[];
  contests: string[];
  coverLetter: string | null;
  strengths: string[];
  careerGoals: string | null;
  domainExperience: string | null;
  englishScore: number | null;
  englishEvidence: string | null;
  rawCandidateDocument: string;
};

type RuleCriterionBreakdown = {
  score: number | null;
  scorePercent: number | null;
  flags: string[];
  [key: string]: unknown;
};

type RuleScoreResult = {
  ruleScore: number;
  weights: SuggestedWeights;
  weightReasoning: WeightReasoning;
  breakdown: Record<WeightKey, RuleCriterionBreakdown>;
  flags: string[];
};

export type NumericCriterionScore = {
  score: number | null;
  scorePercent: number | null;
  candidateValue: number | null;
  requiredValue: number | null;
  maxFit: number | null;
  flags: string[];
};

export type AiScreeningProgress = {
  processedCount: number;
  successCount: number;
  failedCount: number;
};

export type AiScreeningMetrics = {
  extractionDurationMs: number;
  scoringDurationMs: number;
  judgeDurationMs: number;
  saveDurationMs: number;
};

export type AiScreeningRunHooks = {
  runId?: number;
  onStart?: (totalCount: number) => void | Promise<void>;
  onProgress?: (progress: AiScreeningProgress) => void | Promise<void>;
  onMetrics?: (metrics: Partial<AiScreeningMetrics>) => void | Promise<void>;
};

@Injectable()
export class AiScreeningService {
  private readonly logger = new Logger(AiScreeningService.name);
  private readonly ollamaUrl = 'http://localhost:11434/api/generate';
  private readonly model = 'qwen2.5:7b';
  private readonly jobCriteriaPromptVersion = 'jd-criteria-dynamic-weights-v1';
  private readonly judgeTimeoutMs = this.getPositiveIntegerEnv(
    'AI_SCREENING_JUDGE_TIMEOUT_MS',
    240_000,
  );
  private readonly extractionTimeoutMs = this.getPositiveIntegerEnv(
    'AI_SCREENING_EXTRACTION_TIMEOUT_MS',
    180_000,
  );

  constructor(private readonly prisma: PrismaService) {}

  async validateEmployeeAccess(userId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { employee_id: userId },
      include: {
        User: {
          select: {
            role: true,
            is_active: true,
          },
        },
      },
    });

    if (
      !employee ||
      !employee.User.is_active ||
      employee.User.role !== 'EMPLOYEE'
    ) {
      throw new ForbiddenException('Chi employee moi duoc chay AI screening');
    }

    return employee;
  }

  async validateEmployeeJobAccess(userId: number, jobId: number) {
    const employee = await this.validateEmployeeAccess(userId);
    const job = await this.prisma.jobPost.findUnique({
      where: { job_post_id: jobId },
      include: {
        Category: true,
        JobType: true,
        Company: true,
        JobPostSkill: {
          include: {
            Skill: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job khong ton tai');
    }

    if (employee.company_id !== job.company_id) {
      throw new ForbiddenException(
        'Ban khong co quyen chay AI screening cho job cua cong ty khac',
      );
    }

    return { employee, job };
  }

  async validateApplicationForJobAccess(
    userId: number,
    jobId: number,
    applicationId: number,
  ) {
    const { employee, job } = await this.validateEmployeeJobAccess(
      userId,
      jobId,
    );
    const application = await this.prisma.jobPostActivity.findFirst({
      where: {
        application_id: applicationId,
        job_post_id: jobId,
      },
      select: {
        application_id: true,
        status: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Ho so ung vien khong ton tai trong job nay');
    }

    return { employee, job, application };
  }

  async runAiScreeningForJob(
    userId: number,
    jobId: number,
    dto: RunAiScreeningDto,
    hooks?: AiScreeningRunHooks,
  ) {
    const totalStartedAt = Date.now();
    const { employee, job } = await this.validateEmployeeJobAccess(
      userId,
      jobId,
    );
    const screeningMode: ScreeningMode = dto.mode ?? 'fast';
    const judgeTopN = screeningMode === 'deep' ? (dto.judgeTopN ?? 10) : null;
    const logContext = {
      runId: hooks?.runId,
      jobId,
      companyId: employee.company_id,
      employeeId: employee.employee_id,
      mode: screeningMode,
      limit: dto.limit ?? 20,
      judgeTopN,
    };
    this.logScreeningEvent('screening_started', logContext);

    const where: Prisma.JobPostActivityWhereInput = {
      job_post_id: jobId,
      ...(dto.applicationId ? { application_id: dto.applicationId } : {}),
      status: {
        notIn: [ApplicationStatus.REJECTED, ApplicationStatus.FAILED],
      },
      ...(dto.force === true ? {} : { ai_screened_at: null }),
    };

    const activities = await this.prisma.jobPostActivity.findMany({
      where,
      orderBy: { apply_date: 'desc' },
      take: dto.limit ?? 20,
      include: {
        Seeker: {
          include: {
            User: {
              select: {
                full_name: true,
                email: true,
                phone: true,
              },
            },
            CvSkill: true,
            CvExperience: true,
            CvEducation: true,
            CvCertificate: true,
            CvProject: true,
            CvPersonality: true,
          },
        },
      },
    });

    await hooks?.onStart?.(activities.length);
    this.logScreeningEvent('candidate_count', {
      ...logContext,
      candidateCount: activities.length,
    });

    if (activities.length === 0) {
      const totalDurationMs = Date.now() - totalStartedAt;
      await hooks?.onMetrics?.({
        extractionDurationMs: 0,
        scoringDurationMs: 0,
        judgeDurationMs: 0,
        saveDurationMs: 0,
      });
      this.logScreeningEvent('screening_completed', {
        ...logContext,
        durationMs: totalDurationMs,
      });
      return {
        jobId,
        screenedCount: 0,
        failedCount: 0,
        screeningMode,
        judgeTopN,
        results: [],
        errors: [],
      };
    }

    const jobDocument = this.buildJobDocument(job);
    this.logScreeningEvent('job_extraction_started', logContext);
    const extractionStartedAt = Date.now();
    const { jobCriteria, cacheStatus: jobCriteriaCache } =
      await this.getJobCriteriaWithCache(jobId, jobDocument);
    const extractionDurationMs = Date.now() - extractionStartedAt;
    await hooks?.onMetrics?.({ extractionDurationMs });
    this.logScreeningEvent('job_extraction_completed', {
      ...logContext,
      cacheStatus: jobCriteriaCache,
      durationMs: extractionDurationMs,
    });
    const results: AiScreeningResponseItem[] = [];
    const errors: AiScreeningErrorItem[] = [];
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let judgeDurationMs = 0;
    let saveDurationMs = 0;
    const preparedCandidates: Array<{
      activity: (typeof activities)[number];
      candidateProfile: CandidateProfile;
      ruleResult: RuleScoreResult;
    }> = [];

    const scoringStartedAt = Date.now();
    for (const activity of activities) {
      try {
        const candidateDocument = this.buildCandidateDocument(activity);
        const candidateProfile = this.extractCandidateProfile(
          activity,
          candidateDocument,
          jobCriteria,
        );
        const ruleResult = this.calculateRuleScore(
          jobCriteria,
          candidateProfile,
        );
        preparedCandidates.push({ activity, candidateProfile, ruleResult });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown screening error';

        this.logger.warn(
          `AI screening failed for application #${activity.application_id}: ${message}`,
        );
        errors.push({
          applicationId: activity.application_id,
          message: 'Không thể xử lý AI Screening cho hồ sơ này.',
        });
        processedCount += 1;
        failedCount += 1;
        await hooks?.onProgress?.({
          processedCount,
          successCount,
          failedCount,
        });
      }
    }
    const scoringDurationMs = Date.now() - scoringStartedAt;
    await hooks?.onMetrics?.({ scoringDurationMs });
    this.logScreeningEvent('rule_scoring_completed', {
      ...logContext,
      durationMs: scoringDurationMs,
    });

    preparedCandidates.sort(
      (first, second) => second.ruleResult.ruleScore - first.ruleResult.ruleScore,
    );

    for (const [index, prepared] of preparedCandidates.entries()) {
      const { activity, candidateProfile, ruleResult } = prepared;

      try {
        const shouldJudge =
          screeningMode === 'deep' && index < (judgeTopN ?? 0);
        const judgeStartedAt = shouldJudge ? Date.now() : null;
        if (shouldJudge) {
          this.logScreeningEvent('llm_judge_started', logContext);
        }
        const aiResult =
          screeningMode === 'fast'
            ? this.buildRuleOnlyScreeningResult(
                jobCriteria,
                candidateProfile,
                ruleResult,
                screeningMode,
                judgeTopN,
                'skipped_fast_mode',
              )
            : index < (judgeTopN ?? 0)
              ? await this.judgeCandidateWithLLM(
                  jobDocument,
                  jobCriteria,
                  candidateProfile,
                  ruleResult,
                  screeningMode,
                  judgeTopN,
                )
              : this.buildRuleOnlyScreeningResult(
                  jobCriteria,
                  candidateProfile,
                  ruleResult,
                  screeningMode,
                  judgeTopN,
                  'skipped_not_top_n',
                );

        if (judgeStartedAt !== null) {
          const candidateJudgeDurationMs = Date.now() - judgeStartedAt;
          judgeDurationMs += candidateJudgeDurationMs;
          await hooks?.onMetrics?.({ judgeDurationMs });
          this.logScreeningEvent('llm_judge_completed', {
            ...logContext,
            durationMs: candidateJudgeDurationMs,
            status: this.normalizeLlmJudgeStatus(
              aiResult.rawResult.llmJudgeStatus,
            ),
          });
        }
        const saveStartedAt = Date.now();
        await this.prisma.jobPostActivity.update({
          where: { application_id: activity.application_id },
          data: {
            ai_score: aiResult.score,
            ai_recommendation: aiResult.recommendation,
            ai_summary: aiResult.summary,
            ai_strengths: aiResult.strengths as Prisma.InputJsonValue,
            ai_concerns: aiResult.concerns as Prisma.InputJsonValue,
            ai_screened_at: new Date(),
            ai_screened_by_id: employee.employee_id,
            ai_model: aiResult.model,
            ai_raw_result: {
              ...aiResult.rawResult,
              jobCriteriaCache,
            } as Prisma.InputJsonValue,
          },
        });
        const candidateSaveDurationMs = Date.now() - saveStartedAt;
        saveDurationMs += candidateSaveDurationMs;
        await hooks?.onMetrics?.({ saveDurationMs });
        this.logScreeningEvent('database_save_completed', {
          ...logContext,
          durationMs: candidateSaveDurationMs,
        });

        results.push({
          applicationId: activity.application_id,
          score: aiResult.score,
          ruleScore: this.clampScore(aiResult.rawResult.ruleScore),
          llmScore: this.clampScore(aiResult.rawResult.llmScore),
          finalScore: this.clampScore(aiResult.rawResult.finalScore),
          recommendation: aiResult.recommendation,
          llmJudgeStatus: this.normalizeLlmJudgeStatus(
            aiResult.rawResult.llmJudgeStatus,
          ),
          riskFlags: this.normalizeStringArray(aiResult.rawResult.riskFlags),
          summary: aiResult.summary,
          strengths: aiResult.strengths,
          concerns: aiResult.concerns,
        });
        processedCount += 1;
        successCount += 1;
        await hooks?.onProgress?.({
          processedCount,
          successCount,
          failedCount,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown screening error';

        this.logger.warn(
          `AI screening failed for application #${activity.application_id}: ${message}`,
        );
        errors.push({
          applicationId: activity.application_id,
          message: 'Không thể xử lý AI Screening cho hồ sơ này.',
        });
        processedCount += 1;
        failedCount += 1;
        await hooks?.onProgress?.({
          processedCount,
          successCount,
          failedCount,
        });
      }
    }

    results.sort((first, second) => second.score - first.score);
    const totalDurationMs = Date.now() - totalStartedAt;
    await hooks?.onMetrics?.({
      extractionDurationMs,
      scoringDurationMs,
      judgeDurationMs,
      saveDurationMs,
    });
    this.logScreeningEvent('screening_completed', {
      ...logContext,
      durationMs: totalDurationMs,
    });

    return {
      jobId,
      screenedCount: results.length,
      failedCount: errors.length,
      screeningMode,
      judgeTopN,
      results,
      errors,
    };
  }

  async scoreCandidateByContext(
    jobDocument: string,
    candidateDocument: string,
    promptOverride?: string,
  ): Promise<AiScreeningResult> {
    const prompt =
      promptOverride ?? this.buildPrompt(jobDocument, candidateDocument);

    try {
      const response = await this.postToOllama(
        {
          model: this.model,
          prompt,
          format: 'json',
          stream: false,
          options: { temperature: 0.1, num_predict: 500 },
        },
        this.judgeTimeoutMs,
      );

      return this.parseAiResponse(response.data.response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown AI screening error';

      this.logger.warn(`AI screening failed: ${message}`);
      return this.getFallbackResult('Không thể gọi AI Screening.');
    }
  }

  async extractJobCriteria(jobDocument: string): Promise<JobCriteria> {
    const prompt = this.buildJobCriteriaPrompt(jobDocument);

    try {
      const response = await this.postToOllama(
        {
          model: this.model,
          prompt,
          format: 'json',
          stream: false,
          options: { temperature: 0.1, num_predict: 900 },
        },
        this.extractionTimeoutMs,
      );
        const parsed = this.safeParseAiJson(response.data.response);

        if (!this.isRecord(parsed)) {
          return this.getFallbackJobCriteria(jobDocument);
        }

        return this.normalizeJobCriteria(parsed, jobDocument);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown JD extraction error';

        this.logger.warn(`JD extraction failed: ${message}`);
        return this.getFallbackJobCriteria(jobDocument);
      }
    }

  private async getJobCriteriaWithCache(
    jobPostId: number,
    jobDocument: string,
  ): Promise<{ jobCriteria: JobCriteria; cacheStatus: 'hit' | 'miss' }> {
    const jobDocumentHash = createHash('sha256')
      .update(jobDocument)
      .digest('hex');
    const cacheKey = {
      jobPostId,
      jobDocumentHash,
      modelVersion: this.model,
      promptVersion: this.jobCriteriaPromptVersion,
    };

    try {
      const cached = await this.prisma.jobAiCriteriaCache.findUnique({
        where: {
          jobPostId_jobDocumentHash_modelVersion_promptVersion: cacheKey,
        },
      });
      if (cached && this.isRecord(cached.jobCriteria)) {
        return {
          jobCriteria: this.normalizeJobCriteria(cached.jobCriteria, jobDocument),
          cacheStatus: 'hit',
        };
      }
    } catch (error) {
      this.logger.warn(
        `JD criteria cache read failed: ${
          error instanceof Error ? error.message : 'Unknown cache read error'
        }`,
      );
    }

    const jobCriteria = await this.extractJobCriteria(jobDocument);
    try {
      await this.prisma.jobAiCriteriaCache.upsert({
        where: {
          jobPostId_jobDocumentHash_modelVersion_promptVersion: cacheKey,
        },
        create: {
          ...cacheKey,
          jobCriteria: jobCriteria as Prisma.InputJsonValue,
        },
        update: {
          jobCriteria: jobCriteria as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.warn(
        `JD criteria cache write failed: ${
          error instanceof Error ? error.message : 'Unknown cache write error'
        }`,
      );
    }

    return { jobCriteria, cacheStatus: 'miss' };
  }

  private logScreeningEvent(
    event: string,
    fields: Record<string, unknown>,
  ): void {
    this.logger.log(JSON.stringify({ event, ...fields }));
  }

  extractCandidateProfile(
    application: unknown,
    candidateDocument: string,
    jobCriteria?: JobCriteria,
  ): CandidateProfile {
    const activity = this.isRecord(application) ? application : {};
    const seeker = this.isRecord(activity.Seeker) ? activity.Seeker : {};
    const user = this.isRecord(seeker.User) ? seeker.User : {};
    const profileSummary = this.isRecord(seeker.SeekerProfileSummary)
      ? seeker.SeekerProfileSummary
      : {};
    const cvExperiences = this.toRecordArray(seeker.CvExperience);
    const seekerExperiences = this.toRecordArray(seeker.SeekerExperience);
    const cvProjects = this.toRecordArray(seeker.CvProject);
    const seekerProjects = this.toRecordArray(seeker.SeekerProject);
    const cvSkills = this.toRecordArray(seeker.CvSkill);
    const seekerSkills = this.toRecordArray(seeker.SeekerSkill);
    const cvPersonalities = this.toRecordArray(seeker.CvPersonality);
    const experienceIntervals = [
      ...cvExperiences.map((item) =>
        this.toDateInterval(item.startDate, item.endDate),
      ),
      ...seekerExperiences.map((item) =>
        this.toDateInterval(
          item.start_date,
          item.is_current_job ? new Date() : item.end_date,
        ),
      ),
    ].filter((item): item is [number, number] => item !== null);
    const skillYears: Record<string, number> = {};

    for (const item of cvSkills) {
      const name = this.normalizeNullableString(item.name);
      const months = this.normalizeNumericCriterionValue(
        item.experienceMonths,
      );

      if (name && months !== null) {
        skillYears[name] = this.roundYears(months / 12);
      }
    }

    for (const item of seekerSkills) {
      const skill = this.isRecord(item.Skill) ? item.Skill : {};
      const name = this.normalizeNullableString(skill.skill_name);
      const months = this.normalizeNumericCriterionValue(
        item.experience_months,
      );

      if (name && months !== null) {
        skillYears[name] = this.roundYears(months / 12);
      }
    }

    const mainSkills = this.uniqueStrings([
      ...cvSkills.map((item) => item.name),
      ...Object.keys(skillYears),
    ]);
    const projects = [
      ...cvProjects.map((item) =>
        this.joinCandidateFields([
          item.name,
          item.role,
          item.description,
          item.link,
        ]),
      ),
      ...seekerProjects.map((item) =>
        this.joinCandidateFields([
          item.project_name,
          item.role,
          item.technologies,
          item.project_description,
          item.project_url,
        ]),
      ),
    ].filter((item): item is string => item !== null);
    const certificates = [
      ...this.toRecordArray(seeker.CvCertificate).map((item) =>
        this.joinCandidateFields([item.title, item.issuer]),
      ),
      ...this.toRecordArray(seeker.SeekerCertificate).map((item) =>
        this.joinCandidateFields([
          item.certificate_name,
          item.certificate_type,
          item.issuing_organization,
          item.score,
        ]),
      ),
    ].filter((item): item is string => item !== null);
    const education =
      this.toRecordArray(seeker.CvEducation)
        .map((item) =>
          this.joinCandidateFields([
            item.degree,
            item.major,
            item.school,
            item.description,
          ]),
        )
        .find(Boolean) ??
      this.toRecordArray(seeker.SeekerEducation)
        .map((item) =>
          this.joinCandidateFields([
            item.certificate_degree_name,
            item.major,
            item.institute_university_name,
          ]),
        )
        .find(Boolean) ??
      null;
    const experienceEvidence = [
      ...cvExperiences.map((item) => ({
        text: this.joinCandidateFields([
          item.company,
          item.description,
        ]),
        interval: this.toDateInterval(item.startDate, item.endDate),
      })),
      ...seekerExperiences.map((item) => ({
        text: this.joinCandidateFields([
          item.company_name,
          item.description,
        ]),
        interval: this.toDateInterval(
          item.start_date,
          item.is_current_job ? new Date() : item.end_date,
        ),
      })),
    ];
    const apiKeywords = this.uniqueStrings([
      'api',
      'rest api',
      'openapi',
      'json api',
      ...(jobCriteria?.apiOrCoreSkillKeywords ?? []),
    ]);
    const domainKeywords = this.getDomainKeywords(jobCriteria?.domain);
    const projectEvidence = [
      ...cvProjects.map((item) => ({
        text: this.joinCandidateFields([
          item.name,
          item.role,
          item.description,
          item.link,
        ]),
        interval: this.toDateInterval(item.startDate, item.endDate),
      })),
      ...seekerProjects.map((item) => ({
        text: this.joinCandidateFields([
          item.project_name,
          item.role,
          item.technologies,
          item.project_description,
          item.project_url,
        ]),
        interval: this.toDateInterval(item.start_date, item.end_date),
      })),
    ];
    const apiEvidence = [...experienceEvidence, ...projectEvidence].filter(
      (item) => this.textMatchesKeywords(item.text, apiKeywords),
    );
    const domainEvidence = [...experienceEvidence, ...projectEvidence].filter(
      (item) => this.textMatchesKeywords(item.text, domainKeywords),
    );
    const apiSkillYears = Object.entries(skillYears)
      .filter(([name]) => this.textMatchesKeywords(name, apiKeywords))
      .map(([, years]) => years);
    const mainSkillYearValues = Object.entries(skillYears)
      .filter(([name]) =>
        this.textMatchesKeywords(name, jobCriteria?.mainSkillKeywords ?? []),
      )
      .map(([, years]) => years);
    const englishEvidence =
      certificates.find((item) =>
        /\b(ielts|toeic|toefl|english)\b/i.test(item),
      ) ?? null;
    const contestSources = [
      ...certificates,
      ...projects,
      this.normalizeNullableString(profileSummary.about_me),
      this.normalizeNullableString(profileSummary.strengths),
      ...cvPersonalities.map((item) =>
        this.joinCandidateFields([item.type, item.description]),
      ),
    ].filter((item): item is string => item !== null);

    return {
      candidateName: this.normalizeNullableString(user.full_name),
      totalExperience: this.calculateIntervalYears(experienceIntervals),
      mainSkillYears:
        mainSkillYearValues.length > 0
          ? Math.min(...mainSkillYearValues)
          : null,
      apiYears: this.maxNullable([
        ...apiSkillYears,
        this.calculateEvidenceYears(apiEvidence),
      ]),
      domainYears:
        domainKeywords.length > 0
          ? this.calculateEvidenceYears(domainEvidence)
          : null,
      mainSkills,
      skillYears,
      education,
      certificates: this.uniqueStrings(certificates),
      projects: this.uniqueStrings(projects),
      contests: this.uniqueStrings(
        contestSources.filter((item) =>
          /\b(hackathon|competition|contest|award|winner)\b/i.test(item),
        ),
      ),
      coverLetter: this.normalizeNullableString(activity.cover_letter),
      strengths: this.uniqueStrings([
        ...this.splitCandidateList(profileSummary.strengths),
        ...cvPersonalities
          .map((item) => this.joinCandidateFields([item.type, item.description]))
          .filter((item): item is string => item !== null),
      ]),
      careerGoals: this.normalizeNullableString(profileSummary.career_objective),
      domainExperience:
        domainEvidence.length > 0
          ? domainEvidence
              .map((item) => item.text)
              .filter((item): item is string => item !== null)
              .join('; ')
          : null,
      englishScore: this.parseFirstNumber(englishEvidence),
      englishEvidence,
      rawCandidateDocument: candidateDocument,
    };
  }

  getExperienceExtraYears(role: unknown, level: unknown): number | null {
    const roleKey =
      typeof role === 'string' ? role.trim().toLowerCase() : 'other';
    const normalizedRole = Object.prototype.hasOwnProperty.call(
      EXPERIENCE_EXTRA_YEARS_CONFIG,
      roleKey,
    )
      ? roleKey
      : 'other';
    const normalizedLevel =
      typeof level === 'string' && level.trim()
        ? level.trim().toLowerCase()
        : 'other';
    const roleConfig = EXPERIENCE_EXTRA_YEARS_CONFIG[normalizedRole];

    if (Object.prototype.hasOwnProperty.call(roleConfig, normalizedLevel)) {
      return roleConfig[normalizedLevel];
    }

    return (
      EXPERIENCE_EXTRA_YEARS_LEVEL_FALLBACK[normalizedLevel] ??
      EXPERIENCE_EXTRA_YEARS_LEVEL_FALLBACK.other
    );
  }

  calculateMaxFit(
    requiredYears: unknown,
    role: unknown,
    level: unknown,
  ): number | null {
    const normalizedRequiredYears = this.normalizeNumericCriterionValue(
      requiredYears,
    );

    if (normalizedRequiredYears === null || normalizedRequiredYears <= 0) {
      return null;
    }

    const extraYears = this.getExperienceExtraYears(role, level);

    return extraYears === null ? null : normalizedRequiredYears + extraYears;
  }

  scoreNumericCriterion(
    candidateValue: unknown,
    requiredValue: unknown,
    role: unknown,
    level: unknown,
  ): NumericCriterionScore {
    const normalizedCandidateValue =
      this.normalizeNumericCriterionValue(candidateValue);
    const normalizedRequiredValue =
      this.normalizeNumericCriterionValue(requiredValue);

    if (normalizedRequiredValue === null || normalizedRequiredValue <= 0) {
      return {
        score: null,
        scorePercent: null,
        candidateValue: normalizedCandidateValue,
        requiredValue: null,
        maxFit: null,
        flags: [],
      };
    }

    const maxFit = this.calculateMaxFit(normalizedRequiredValue, role, level);

    if (normalizedCandidateValue === null) {
      return {
        score: 0,
        scorePercent: 0,
        candidateValue: null,
        requiredValue: normalizedRequiredValue,
        maxFit,
        flags: ['missing_information'],
      };
    }

    const flags: string[] = [];

    if (normalizedCandidateValue < normalizedRequiredValue) {
      flags.push('underqualified');
    }

    if (normalizedCandidateValue - normalizedRequiredValue >= 5) {
      flags.push('possibly_overqualified');
    }

    const rawScore =
      maxFit === null
        ? normalizedCandidateValue >= normalizedRequiredValue
          ? 1
          : normalizedCandidateValue / normalizedRequiredValue
        : Math.min(normalizedCandidateValue, maxFit) / maxFit;
    const score = Math.min(1, Math.max(0, rawScore));

    return {
      score,
      scorePercent: score * 100,
      candidateValue: normalizedCandidateValue,
      requiredValue: normalizedRequiredValue,
      maxFit,
      flags,
    };
  }

  calculateRuleScore(
    jobCriteria: JobCriteria,
    candidateProfile: CandidateProfile,
  ): RuleScoreResult {
    const fallbackCriteria = this.getFallbackJobCriteria();
    const safeJobCriteria: JobCriteria = {
      ...fallbackCriteria,
      ...jobCriteria,
      requiredYears: {
        ...fallbackCriteria.requiredYears,
        ...jobCriteria.requiredYears,
      },
      suggestedWeights:
        jobCriteria.suggestedWeights ?? fallbackCriteria.suggestedWeights,
      weightReasoning:
        jobCriteria.weightReasoning ?? fallbackCriteria.weightReasoning,
    };
    const weights = this.normalizeWeights(safeJobCriteria.suggestedWeights);
    const breakdown: Record<WeightKey, RuleCriterionBreakdown> = {
      totalExperience: this.scoreNumericCriterion(
        candidateProfile.totalExperience,
        safeJobCriteria.requiredYears.totalExperience,
        safeJobCriteria.role,
        safeJobCriteria.level,
      ),
      mainTechnicalSkillYears: this.scoreNumericCriterion(
        candidateProfile.mainSkillYears,
        safeJobCriteria.requiredYears.mainSkillYears,
        safeJobCriteria.role,
        safeJobCriteria.level,
      ),
      apiOrCoreSkillYears: this.scoreNumericCriterion(
        candidateProfile.apiYears,
        safeJobCriteria.requiredYears.apiYears,
        safeJobCriteria.role,
        safeJobCriteria.level,
      ),
      requiredSkills: this.scoreKeywordCriterion(
        safeJobCriteria.requiredSkills,
        candidateProfile,
        true,
      ),
      preferredSkills: this.scoreKeywordCriterion(
        safeJobCriteria.preferredSkills,
        candidateProfile,
      ),
      domain: this.scoreDomainCriterion(safeJobCriteria, candidateProfile),
      englishEducationCertificate:
        this.scoreEnglishEducationCertificateCriterion(
          safeJobCriteria,
          candidateProfile,
        ),
      projectContest: this.scoreProjectContestCriterion(
        safeJobCriteria,
        candidateProfile,
      ),
    };
    const activeWeightTotal = WEIGHT_KEYS.reduce(
      (total, key) =>
        breakdown[key].score === null ? total : total + weights[key],
      0,
    );
    const weightedScore = WEIGHT_KEYS.reduce(
      (total, key) => total + (breakdown[key].score ?? 0) * weights[key],
      0,
    );
    const ruleScore = this.clampScore(
      activeWeightTotal > 0 ? (weightedScore / activeWeightTotal) * 100 : 0,
    );
    const flags = this.uniqueStrings(
      WEIGHT_KEYS.flatMap((key) => breakdown[key].flags),
    );

    return {
      ruleScore,
      weights,
      weightReasoning: safeJobCriteria.weightReasoning,
      breakdown,
      flags,
    };
  }

  normalizeWeights(input?: Record<string, number>): SuggestedWeights {
    const fallback: SuggestedWeights = {
      totalExperience: 10,
      mainTechnicalSkillYears: 20,
      apiOrCoreSkillYears: 15,
      requiredSkills: 20,
      preferredSkills: 10,
      domain: 10,
      englishEducationCertificate: 5,
      projectContest: 10,
    };
    const cleaned = Object.fromEntries(
      WEIGHT_KEYS.map((key) => {
        const value = Number(input?.[key] ?? 0);
        return [key, Number.isFinite(value) ? Math.max(0, Math.min(value, 40)) : 0];
      }),
    ) as SuggestedWeights;
    const total = WEIGHT_KEYS.reduce((sum, key) => sum + cleaned[key], 0);

    if (total <= 0) {
      return fallback;
    }

    const normalized = Object.fromEntries(
      WEIGHT_KEYS.map((key) => [
        key,
        Math.floor(Math.min(40, (cleaned[key] / total) * 100)),
      ]),
    ) as SuggestedWeights;
    let remaining = 100 - WEIGHT_KEYS.reduce(
      (sum, key) => sum + normalized[key],
      0,
    );
    const distributionOrder = [...WEIGHT_KEYS].sort(
      (first, second) =>
        cleaned[second] - cleaned[first] ||
        fallback[second] - fallback[first],
    );

    while (remaining > 0) {
      for (const key of distributionOrder) {
        if (remaining === 0) {
          break;
        }

        if (normalized[key] < 40) {
          normalized[key] += 1;
          remaining -= 1;
        }
      }
    }

    return normalized;
  }

  private scoreKeywordCriterion(
    requiredKeywords: string[],
    candidateProfile: CandidateProfile,
    mandatory = false,
  ): RuleCriterionBreakdown {
    const required = this.uniqueStrings(requiredKeywords);

    if (required.length === 0) {
      return this.createSkippedCriterion({ matched: [], required });
    }

    const candidateEvidence = this.getCandidateEvidence(candidateProfile);
    const matched = required.filter((keyword) =>
      this.textMatchesKeywords(candidateEvidence, [keyword]),
    );
    const score = matched.length / required.length;
    const flags = candidateEvidence ? [] : ['missing_information'];

    if (mandatory && matched.length < required.length) {
      flags.push('underqualified');
    }

    return {
      score,
      scorePercent: score * 100,
      matched,
      required,
      flags,
    };
  }

  private scoreDomainCriterion(
    jobCriteria: JobCriteria,
    candidateProfile: CandidateProfile,
  ): RuleCriterionBreakdown {
    if (jobCriteria.requiredYears.domainYears !== null) {
      return this.scoreNumericCriterion(
        candidateProfile.domainYears,
        jobCriteria.requiredYears.domainYears,
        jobCriteria.role,
        jobCriteria.level,
      );
    }

    const domainKeywords = this.getDomainKeywords(jobCriteria.domain);

    if (domainKeywords.length === 0) {
      return this.createSkippedCriterion({
        matched: [],
        required: domainKeywords,
      });
    }

    const evidence = [
      candidateProfile.domainExperience,
      candidateProfile.rawCandidateDocument,
      ...candidateProfile.projects,
    ]
      .filter((value): value is string => typeof value === 'string')
      .join('\n');
    const matched = domainKeywords.filter((keyword) =>
      this.textMatchesKeywords(evidence, [keyword]),
    );
    const score = matched.length > 0 ? 1 : 0;

    return {
      score,
      scorePercent: score * 100,
      matched,
      required: domainKeywords,
      flags: evidence ? [] : ['missing_information'],
    };
  }

  private scoreEnglishEducationCertificateCriterion(
    jobCriteria: JobCriteria,
    candidateProfile: CandidateProfile,
  ): RuleCriterionBreakdown {
    const required: string[] = [];
    const matched: string[] = [];

    if (jobCriteria.englishRequirement) {
      required.push(jobCriteria.englishRequirement);
      if (
        candidateProfile.englishScore !== null ||
        candidateProfile.englishEvidence
      ) {
        matched.push(jobCriteria.englishRequirement);
      }
    }

    if (jobCriteria.educationRequirement) {
      required.push(jobCriteria.educationRequirement);
      if (candidateProfile.education) {
        matched.push(jobCriteria.educationRequirement);
      }
    }

    for (const certificate of this.uniqueStrings(jobCriteria.certificates)) {
      required.push(certificate);
      if (
        candidateProfile.certificates.some((candidateCertificate) =>
          this.textMatchesKeywords(candidateCertificate, [certificate]),
        )
      ) {
        matched.push(certificate);
      }
    }

    if (required.length === 0) {
      return this.createSkippedCriterion({ matched, required });
    }

    const score = matched.length / required.length;

    return {
      score,
      scorePercent: score * 100,
      matched,
      required,
      flags: matched.length > 0 ? [] : ['missing_information'],
    };
  }

  private scoreProjectContestCriterion(
    jobCriteria: JobCriteria,
    candidateProfile: CandidateProfile,
  ): RuleCriterionBreakdown {
    const required = this.uniqueStrings(jobCriteria.projectKeywords);

    if (required.length === 0) {
      return this.createSkippedCriterion({ matched: [], required });
    }

    const evidence = [
      ...candidateProfile.projects,
      ...candidateProfile.contests,
      candidateProfile.rawCandidateDocument,
    ].join('\n');
    const matched = required.filter((keyword) =>
      this.textMatchesKeywords(evidence, [keyword]),
    );
    const score = matched.length / required.length;

    return {
      score,
      scorePercent: score * 100,
      matched,
      required,
      flags: evidence ? [] : ['missing_information'],
    };
  }

  private createSkippedCriterion(
    details: Record<string, unknown>,
  ): RuleCriterionBreakdown {
    return {
      score: null,
      scorePercent: null,
      flags: [],
      ...details,
    };
  }

  private getCandidateEvidence(candidateProfile: CandidateProfile): string {
    return [
      ...candidateProfile.mainSkills,
      ...Object.keys(candidateProfile.skillYears),
      ...candidateProfile.certificates,
      ...candidateProfile.projects,
      ...candidateProfile.contests,
      candidateProfile.rawCandidateDocument,
    ].join('\n');
  }

  private buildRuleBasedInsights(ruleResult: RuleScoreResult) {
    const entries = WEIGHT_KEYS.map((key) => ({
      key,
      detail: ruleResult.breakdown[key],
      weight: ruleResult.weights[key] ?? 0,
      scorePercent: ruleResult.breakdown[key].scorePercent,
    })).filter((entry) => typeof entry.scorePercent === 'number');

    const strengths = entries
      .filter((entry) => (entry.scorePercent ?? 0) >= 80)
      .sort(
        (first, second) =>
          (second.scorePercent ?? 0) - (first.scorePercent ?? 0) ||
          second.weight - first.weight,
      )
      .map((entry) => this.formatRuleInsight(entry.key, entry.detail, true));

    const concerns = entries
      .filter(
        (entry) =>
          (entry.scorePercent ?? 0) < 60 ||
          entry.detail.flags.includes('missing_information') ||
          entry.detail.flags.includes('underqualified'),
      )
      .sort(
        (first, second) =>
          second.weight - first.weight ||
          (first.scorePercent ?? 0) - (second.scorePercent ?? 0),
      )
      .map((entry) => this.formatRuleInsight(entry.key, entry.detail, false));

    return {
      strengths: this.uniqueStrings(strengths).slice(0, 4),
      concerns: this.uniqueStrings(concerns).slice(0, 4),
    };
  }

  private formatRuleInsight(
    key: WeightKey,
    detail: RuleCriterionBreakdown,
    isStrength: boolean,
  ) {
    const label = WEIGHT_LABELS[key];
    const matched = this.normalizeStringArray(detail.matched);
    const required = this.normalizeStringArray(detail.required);
    const candidateValue =
      typeof detail.candidateValue === 'number' ? detail.candidateValue : null;
    const requiredValue =
      typeof detail.requiredValue === 'number' ? detail.requiredValue : null;

    if (isStrength) {
      if (matched.length > 0) {
        return `Đáp ứng tốt ${label}: ${matched.slice(0, 4).join(', ')}.`;
      }

      if (candidateValue !== null && requiredValue !== null) {
        return `Đáp ứng tốt ${label}: ${candidateValue}/${requiredValue} năm yêu cầu.`;
      }

      return `Đáp ứng tốt tiêu chí ${label}.`;
    }

    const missing = required.filter(
      (item) =>
        !matched.some(
          (matchedItem) => matchedItem.toLowerCase() === item.toLowerCase(),
        ),
    );

    if (missing.length > 0) {
      return `Cần bổ sung/kiểm tra ${label}: ${missing.slice(0, 4).join(', ')}.`;
    }

    if (candidateValue !== null && requiredValue !== null) {
      return `Cần cải thiện ${label}: ${candidateValue}/${requiredValue} năm yêu cầu.`;
    }

    if (detail.flags.includes('missing_information')) {
      return `Cần bổ sung thông tin về ${label} trong CV.`;
    }

    return `Cần xem xét thêm tiêu chí ${label}.`;
  }

  async judgeCandidateWithLLM(
    jobDocument: string,
    jobCriteria: JobCriteria,
    candidateProfile: CandidateProfile,
    ruleResult: RuleScoreResult,
    screeningMode: ScreeningMode = 'deep',
    judgeTopN: number | null = null,
  ): Promise<AiScreeningResult> {
    const prompt = this.buildJudgePrompt(jobCriteria, candidateProfile, ruleResult);
    const aiResult = await this.scoreCandidateByContext(
      jobDocument,
      candidateProfile.rawCandidateDocument,
      prompt,
    );

    if (aiResult.isFallback) {
      const ruleInsights = this.buildRuleBasedInsights(ruleResult);
      const concerns = this.uniqueStrings([
        ...aiResult.concerns,
        ...ruleInsights.concerns,
      ]);
      const llmScore = ruleResult.ruleScore;
      const finalScore = this.calculateFinalScore(
        ruleResult.ruleScore,
        llmScore,
        'failed',
      );
      const riskFlags = this.mergeJudgeRiskFlags(ruleResult.flags, [
        'llm_judge_failed',
      ]);
      const summary =
        'LLM Judge không phản hồi hoặc lỗi, hệ thống sử dụng Rule Score làm điểm cuối.';

      return {
        score: finalScore,
        recommendation: this.classifyFitLabel(finalScore),
        summary,
        strengths: ruleInsights.strengths,
        concerns,
        rawResult: this.buildDynamicScreeningRawResult(
          jobCriteria,
          candidateProfile,
          ruleResult,
          llmScore,
          finalScore,
          riskFlags,
          'failed',
          screeningMode,
          judgeTopN,
          {
            llmScore,
            summary,
            strengths: ruleInsights.strengths,
            concerns,
            errorMessage: aiResult.errorMessage,
            riskFlags,
            recommendation: this.classifyFitLabel(finalScore),
            fitLabel: this.getVietnameseFitLabel(finalScore),
          },
        ),
        model: `${this.model} + rule-score-v2-dynamic-weights`,
        isFallback: false,
      };
    }

    const llmScore = ruleResult.flags.includes('underqualified')
      ? Math.min(aiResult.score, 69)
      : aiResult.score;
    const score = this.calculateFinalScore(ruleResult.ruleScore, llmScore);
    const riskFlags = this.mergeJudgeRiskFlags(
      ruleResult.flags,
      this.normalizeStringArray(aiResult.rawResult.riskFlags),
    );
    const ruleInsights = this.buildRuleBasedInsights(ruleResult);
    const strengths = aiResult.strengths.length
      ? aiResult.strengths
      : ruleInsights.strengths;
    const concerns = aiResult.concerns.length
      ? aiResult.concerns
      : ruleInsights.concerns;

    return {
      ...aiResult,
      score,
      strengths,
      concerns,
      recommendation: this.classifyFitLabel(score),
      rawResult: this.buildDynamicScreeningRawResult(
        jobCriteria,
        candidateProfile,
        ruleResult,
        llmScore,
        score,
        riskFlags,
        'success',
        screeningMode,
        judgeTopN,
        {
          ...aiResult.rawResult,
          strengths,
          concerns,
        },
      ),
      model: `${this.model} + rule-score-v2-dynamic-weights`,
    };
  }

  calculateFinalScore(
    ruleScore: unknown,
    llmScore: unknown,
    llmJudgeStatus: 'success' | 'failed' = 'success',
  ): number {
    const normalizedRuleScore = this.clampScore(ruleScore);

    if (llmJudgeStatus === 'failed') {
      return normalizedRuleScore;
    }

    const normalizedLlmScore = this.clampScore(llmScore);

    return this.clampScore(normalizedRuleScore * 0.7 + normalizedLlmScore * 0.3);
  }

  private buildRuleOnlyScreeningResult(
    jobCriteria: JobCriteria,
    candidateProfile: CandidateProfile,
    ruleResult: RuleScoreResult,
    screeningMode: ScreeningMode,
    judgeTopN: number | null,
    llmJudgeStatus: 'skipped_fast_mode' | 'skipped_not_top_n',
  ): AiScreeningResult {
    const finalScore = ruleResult.ruleScore;
    const riskFlag =
      llmJudgeStatus === 'skipped_fast_mode'
        ? 'llm_judge_skipped_fast_mode'
        : 'llm_judge_skipped_not_top_n';
    const riskFlags = this.mergeJudgeRiskFlags(ruleResult.flags, [riskFlag]);
    const summary =
      llmJudgeStatus === 'skipped_fast_mode'
        ? 'Fast Mode sử dụng Rule Score làm điểm cuối và không gọi LLM Judge.'
        : 'Hồ sơ nằm ngoài Top N của Deep Mode, hệ thống sử dụng Rule Score làm điểm cuối.';

    const ruleInsights = this.buildRuleBasedInsights(ruleResult);

    return {
      score: finalScore,
      recommendation: this.classifyFitLabel(finalScore),
      summary,
      strengths: ruleInsights.strengths,
      concerns: ruleInsights.concerns,
      rawResult: this.buildDynamicScreeningRawResult(
        jobCriteria,
        candidateProfile,
        ruleResult,
        ruleResult.ruleScore,
        finalScore,
        riskFlags,
        llmJudgeStatus,
        screeningMode,
        judgeTopN,
        {
          llmScore: ruleResult.ruleScore,
          summary,
          strengths: ruleInsights.strengths,
          concerns: ruleInsights.concerns,
          riskFlags,
          recommendation: this.classifyFitLabel(finalScore),
          fitLabel: this.getVietnameseFitLabel(finalScore),
        },
      ),
      model: `${this.model} + rule-score-v2-dynamic-weights`,
      isFallback: false,
    };
  }

  classifyFitLabel(score: number): AiScreeningRecommendation {
    if (score >= 85) {
      return 'STRONG_MATCH';
    }

    if (score >= 70) {
      return 'MATCH';
    }

    if (score >= 50) {
      return 'NEEDS_REVIEW';
    }

    return 'LOW_MATCH';
  }

  private getFallbackJobCriteria(jobDocument = ''): JobCriteria {
    const mainSkillKeywords = this.detectMainSkillKeywords(jobDocument);
    const apiOrCoreSkillKeywords = this.detectApiOrCoreKeywords(jobDocument);

    return this.normalizeJobCriteria(
      {
        role: this.inferJobRole(jobDocument),
        level: this.inferJobLevel(jobDocument),
        mainSkillKeywords,
        apiOrCoreSkillKeywords,
        requiredSkills: this.uniqueStrings([
          ...mainSkillKeywords,
          ...apiOrCoreSkillKeywords,
        ]),
        suggestedWeights: this.getBalancedSuggestedWeights(),
        weightReasoning: this.getFallbackWeightReasoning(),
      },
      jobDocument,
    );
  }

  private async postToOllama(
    payload: Record<string, unknown>,
    timeout: number,
  ) {
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), timeout);
    abortTimer.unref?.();

    try {
      return await axios.post<OllamaGenerateResponse>(this.ollamaUrl, payload, {
        timeout,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(abortTimer);
    }
  }

  private getPositiveIntegerEnv(name: string, fallback: number): number {
    const value = Number(process.env[name]);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private normalizeJobCriteria(
    parsed: Record<string, any>,
    jobDocument = '',
  ): JobCriteria {
    const requiredYears = this.isRecord(parsed.requiredYears)
      ? parsed.requiredYears
      : {};
    const explicitYears = this.extractExplicitRequiredYears(jobDocument);
    const mainSkillKeywords = this.normalizeStringArray(
      parsed.mainSkillKeywords,
    );
    const apiOrCoreSkillKeywords = this.uniqueStrings([
      ...this.normalizeStringArray(parsed.apiOrCoreSkillKeywords),
      ...this.detectApiOrCoreKeywords(jobDocument),
    ]);
    const parsedRequiredSkills = this.normalizeStringArray(
      parsed.requiredSkills,
    );
    const domain = this.normalizeNullableString(parsed.domain);

    return {
      role: this.normalizeJobRole(parsed.role),
      level: this.normalizeJobLevel(parsed.level),
      requiredYears: {
        totalExperience:
          this.normalizeRequiredExperienceYears(
            requiredYears.totalExperience,
            40,
          ) ?? explicitYears,
        mainSkillYears:
          this.normalizeRequiredExperienceYears(
            requiredYears.mainSkillYears,
            20,
          ) ?? (mainSkillKeywords.length > 0 ? explicitYears : null),
        apiYears: this.normalizeRequiredExperienceYears(
          requiredYears.apiYears,
          20,
        ),
        domainYears: domain
          ? this.normalizeRequiredExperienceYears(
              requiredYears.domainYears,
              20,
            )
          : null,
      },
      mainSkillKeywords,
      apiOrCoreSkillKeywords,
      requiredSkills:
        parsedRequiredSkills.length > 0
          ? parsedRequiredSkills
          : this.uniqueStrings([
              ...mainSkillKeywords,
              ...apiOrCoreSkillKeywords,
            ]),
      preferredSkills: this.normalizeStringArray(parsed.preferredSkills),
      domain,
      englishRequirement: this.normalizeNullableString(
        parsed.englishRequirement,
      ),
      educationRequirement: this.normalizeNullableString(
        parsed.educationRequirement,
      ),
      certificates: this.normalizeStringArray(parsed.certificates),
      projectKeywords: this.normalizeStringArray(parsed.projectKeywords),
      suggestedWeights: this.normalizeSuggestedWeights(
        parsed.suggestedWeights,
      ),
      weightReasoning: this.normalizeWeightReasoning(parsed.weightReasoning),
    };
  }

  private getBalancedSuggestedWeights(): SuggestedWeights {
    return {
      totalExperience: 13,
      mainTechnicalSkillYears: 13,
      apiOrCoreSkillYears: 13,
      requiredSkills: 13,
      preferredSkills: 12,
      domain: 12,
      englishEducationCertificate: 12,
      projectContest: 12,
    };
  }

  private getFallbackWeightReasoning(): WeightReasoning {
    return {
      totalExperience: '',
      mainTechnicalSkillYears: '',
      apiOrCoreSkillYears: '',
      requiredSkills: '',
      preferredSkills: '',
      domain: '',
      englishEducationCertificate: '',
      projectContest: '',
    };
  }

  private normalizeSuggestedWeights(value: unknown): SuggestedWeights {
    const fallback = this.getBalancedSuggestedWeights();
    const source = this.isRecord(value) ? value : {};

    return Object.fromEntries(
      WEIGHT_KEYS.map((key) => [
        key,
        Object.prototype.hasOwnProperty.call(source, key)
          ? this.normalizeSuggestedWeight(source[key])
          : fallback[key],
      ]),
    ) as SuggestedWeights;
  }

  private normalizeSuggestedWeight(value: unknown): number {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (typeof value !== 'number' && typeof value !== 'string')
    ) {
      return 0;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue)
      ? Math.min(40, Math.max(0, numericValue))
      : 0;
  }

  private normalizeWeightReasoning(value: unknown): WeightReasoning {
    const source = this.isRecord(value) ? value : {};

    return Object.fromEntries(
      WEIGHT_KEYS.map((key) => [
        key,
        this.normalizeNullableString(source[key]) ?? '',
      ]),
    ) as WeightReasoning;
  }

  private normalizeJobRole(value: unknown): JobRole {
    return typeof value === 'string' &&
      JOB_ROLES.includes(value.trim().toLowerCase() as JobRole)
      ? (value.trim().toLowerCase() as JobRole)
      : 'other';
  }

  private normalizeJobLevel(value: unknown): JobLevel {
    return typeof value === 'string' &&
      JOB_LEVELS.includes(value.trim().toLowerCase() as JobLevel)
      ? (value.trim().toLowerCase() as JobLevel)
      : 'other';
  }

  private normalizeExperienceYears(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value !== 'number' && typeof value !== 'string') {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) && numericValue >= 0
      ? numericValue
      : null;
  }

  private normalizeRequiredExperienceYears(
    value: unknown,
    maximum: number,
  ): number | null {
    const years = this.normalizeExperienceYears(value);
    return years !== null && years <= maximum ? years : null;
  }

  private extractExplicitRequiredYears(jobDocument: string): number | null {
    const match = jobDocument.match(
      /(\d+(?:[.,]\d+)?)\s*\+?\s*(?:năm|nam|years?|yrs?)/i,
    );

    if (!match) {
      return null;
    }

    return this.normalizeRequiredExperienceYears(
      match[1].replace(',', '.'),
      40,
    );
  }

  private detectApiOrCoreKeywords(jobDocument: string): string[] {
    const keywords = [
      'REST API',
      'OpenAPI',
      'GraphQL',
      'Microservices',
      'System Design',
      'JSON API',
    ];

    return keywords.filter((keyword) =>
      this.textMatchesKeywords(jobDocument, [keyword]),
    );
  }

  private detectMainSkillKeywords(jobDocument: string): string[] {
    const keywords = [
      'NestJS',
      'Node.js',
      'Java',
      'Spring Boot',
      'Spring',
      'C#',
      '.NET',
      'PHP',
      'Laravel',
      'Python',
      'Django',
      'FastAPI',
      'Go',
      'Golang',
      'React',
      'Next.js',
      'Vue',
      'Angular',
      'Flutter',
      'React Native',
      'Kotlin',
      'Swift',
      'Kubernetes',
      'Docker',
      'AWS',
      'Azure',
      'GCP',
      'SQL',
      'Power BI',
      'Machine Learning',
      'TensorFlow',
      'PyTorch',
    ];

    return keywords.filter((keyword) =>
      this.textMatchesKeywords(jobDocument, [keyword]),
    );
  }

  private inferJobRole(jobDocument: string): JobRole {
    const roleKeywords: Array<[JobRole, string[]]> = [
      ['fullstack', ['fullstack', 'full-stack']],
      ['frontend', ['frontend', 'front-end', 'react', 'vue', 'angular']],
      ['mobile', ['mobile', 'flutter', 'react native', 'kotlin', 'swift']],
      ['qa_automation', ['qa automation', 'automation tester', 'test automation']],
      ['qa_manual', ['qa', 'tester', 'manual test']],
      ['data_engineer', ['data engineer']],
      ['data_analyst', ['data analyst', 'power bi']],
      ['mlops_ai_lead', ['mlops', 'ai lead', 'ml lead']],
      ['ai_ml_engineer', ['ai engineer', 'ml engineer', 'machine learning']],
      ['cloud_platform', ['cloud platform', 'platform engineer']],
      ['devops', ['devops', 'kubernetes']],
      ['business_analyst', ['business analyst']],
      ['product_owner', ['product owner']],
      ['head_of_product', ['head of product']],
      ['product_manager', ['product manager']],
      ['ui_ux', ['ui/ux', 'ui ux', 'ux designer', 'ui designer']],
      [
        'backend',
        [
          'backend',
          'back-end',
          'nestjs',
          'spring boot',
          'rest api',
          'fastapi',
        ],
      ],
    ];

    return (
      roleKeywords.find(([, keywords]) =>
        this.textMatchesKeywords(jobDocument, keywords),
      )?.[0] ?? 'other'
    );
  }

  private inferJobLevel(jobDocument: string): JobLevel {
    const levelKeywords: Array<[JobLevel, string[]]> = [
      ['head', ['head of']],
      ['architect', ['architect']],
      ['manager', ['manager']],
      ['lead', ['lead', 'team leader']],
      ['senior', ['senior', 'sr.']],
      ['middle', ['middle', 'mid-level', 'mid level']],
      ['junior', ['junior', 'jr.']],
      ['fresher', ['fresher']],
      ['intern', ['intern', 'internship']],
    ];
    const keywordLevel = levelKeywords.find(([, keywords]) =>
      this.textMatchesKeywords(jobDocument, keywords),
    )?.[0];

    if (keywordLevel) {
      return keywordLevel;
    }

    const years = this.extractExplicitRequiredYears(jobDocument);

    if (years === null) return 'other';
    if (years <= 1) return 'fresher';
    if (years <= 2) return 'junior';
    if (years <= 4) return 'middle';
    if (years <= 7) return 'senior';
    return 'lead';
  }

  private toRecordArray(value: unknown): Record<string, any>[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is Record<string, any> =>
      this.isRecord(item),
    );
  }

  private uniqueStrings(values: unknown[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
      const normalized = this.normalizeNullableString(value);

      if (!normalized || seen.has(normalized.toLowerCase())) {
        continue;
      }

      seen.add(normalized.toLowerCase());
      result.push(normalized);
    }

    return result;
  }

  private joinCandidateFields(values: unknown[]): string | null {
    const fields = values
      .map((value) => this.normalizeNullableString(value))
      .filter((value): value is string => value !== null);

    return fields.length > 0 ? fields.join(' - ') : null;
  }

  private splitCandidateList(value: unknown): string[] {
    if (typeof value !== 'string') {
      return [];
    }

    return this.uniqueStrings(value.split(/[,;\n]+/));
  }

  private toDateInterval(
    startValue: unknown,
    endValue: unknown,
  ): [number, number] | null {
    const start = this.toTimestamp(startValue);

    if (start === null) {
      return null;
    }

    const end = this.toTimestamp(endValue) ?? Date.now();

    return end > start ? [start, end] : null;
  }

  private toTimestamp(value: unknown): number | null {
    if (
      value === null ||
      value === undefined ||
      (typeof value !== 'string' && !(value instanceof Date))
    ) {
      return null;
    }

    const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);

    return Number.isFinite(timestamp) ? timestamp : null;
  }

  private calculateIntervalYears(
    intervals: Array<[number, number]>,
  ): number | null {
    if (intervals.length === 0) {
      return null;
    }

    const sorted = [...intervals].sort((first, second) => first[0] - second[0]);
    const merged: Array<[number, number]> = [];

    for (const interval of sorted) {
      const previous = merged.at(-1);

      if (!previous || interval[0] > previous[1]) {
        merged.push([...interval]);
        continue;
      }

      previous[1] = Math.max(previous[1], interval[1]);
    }

    const totalMilliseconds = merged.reduce(
      (total, [start, end]) => total + (end - start),
      0,
    );

    return this.roundYears(totalMilliseconds / (365.25 * 24 * 60 * 60 * 1000));
  }

  private calculateEvidenceYears(
    evidence: Array<{
      text: string | null;
      interval: [number, number] | null;
    }>,
  ): number | null {
    return this.calculateIntervalYears(
      evidence
        .map((item) => item.interval)
        .filter((item): item is [number, number] => item !== null),
    );
  }

  private roundYears(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private maxNullable(values: Array<number | null>): number | null {
    const numericValues = values.filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );

    return numericValues.length > 0 ? Math.max(...numericValues) : null;
  }

  private textMatchesKeywords(
    value: unknown,
    keywords: string[],
  ): boolean {
    if (typeof value !== 'string' || keywords.length === 0) {
      return false;
    }

    const normalizedValue = value.toLowerCase();

    return keywords.some((keyword) => {
      const normalizedKeyword = keyword.trim().toLowerCase();
      return normalizedKeyword && normalizedValue.includes(normalizedKeyword);
    });
  }

  private getDomainKeywords(domain: string | null | undefined): string[] {
    if (!domain) {
      return [];
    }

    const normalizedDomain = domain.trim().toLowerCase();
    const relatedKeywords: Record<string, string[]> = {
      banking: ['banking', 'fintech', 'payment', 'online banking'],
    };

    return this.uniqueStrings([
      normalizedDomain,
      ...(relatedKeywords[normalizedDomain] ?? []),
    ]);
  }

  private parseFirstNumber(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const match = value.match(/\d+(?:\.\d+)?/);

    return match ? Number(match[0]) : null;
  }

  private normalizeNumericCriterionValue(value: unknown): number | null {
    return this.normalizeExperienceYears(value);
  }

  private normalizeNullableString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    return value.trim() || null;
  }

  private async saveFallbackDebug(
    applicationId: number,
    aiResult: AiScreeningResult,
  ) {
    try {
      await this.prisma.jobPostActivity.update({
        where: { application_id: applicationId },
        data: {
          ai_raw_result: {
            error: aiResult.errorMessage ?? aiResult.summary,
            isFallback: true,
            model: aiResult.model,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown fallback debug error';

      this.logger.warn(
        `Could not save AI fallback debug for application #${applicationId}: ${message}`,
      );
    }
  }

  buildJobDocument(job: any): string {
    const skills = Array.isArray(job.JobPostSkill)
      ? job.JobPostSkill.map((item: any) => item.Skill?.skill_name).filter(Boolean)
      : [];

    return [
      this.formatLine('Tieu de', job.job_title || job.name),
      this.formatLine('Ten job', job.name),
      this.formatLine('Mo ta', job.job_description),
      this.formatLine('Yeu cau ung vien', job.candidate_requirements),
      this.formatLine('Quyen loi', job.benefits),
      this.formatLine('Dia diem', job.work_location),
      this.formatLine('Thoi gian lam viec', job.work_time),
      this.formatLine('Hinh thuc lam viec', job.work_type),
      this.formatLine('Cap bac', job.level),
      this.formatLine('Kinh nghiem yeu cau', job.experience),
      this.formatLine('Hoc van yeu cau', job.education),
      this.formatLine('Muc luong', job.salary),
      this.formatLine('So luong tuyen', job.number_of_hires),
      this.formatLine('Danh muc', job.Category?.name),
      this.formatLine('Loai cong viec', job.JobType?.job_type),
      this.formatLine('Ky nang gan voi job', skills.join(', ')),
      this.formatLine('Cong ty', job.Company?.company_name),
    ]
      .filter(Boolean)
      .join('\n');
  }

  buildCandidateDocument(activity: any): string {
    const seeker = activity.Seeker;
    const user = seeker?.User;
    const cvSkills = this.mapItems(
      seeker?.CvSkill,
      (item) =>
        [
          item.name,
          item.category,
          item.experienceMonths ? `${item.experienceMonths} thang` : null,
          item.isStrong ? 'the manh' : null,
        ]
          .filter(Boolean)
          .join(' - '),
    );
    const seekerSkills = this.mapItems(
      seeker?.SeekerSkill,
      (item) =>
        `${item.Skill?.skill_name ?? ''}${item.experience_months ? ` (${item.experience_months} thang)` : ''}`,
    );
    const cvExperiences = this.mapItems(
      seeker?.CvExperience,
      (item) =>
        [
          item.position,
          item.company,
          this.formatDateRange(item.startDate, item.endDate),
          item.description,
        ]
          .filter(Boolean)
          .join(' - '),
    );
    const seekerExperiences = this.mapItems(
      seeker?.SeekerExperience,
      (item) =>
        [
          item.job_title,
          item.company_name,
          this.formatDateRange(item.start_date, item.end_date),
          item.is_current_job ? 'Dang lam viec' : null,
          item.description,
        ]
          .filter(Boolean)
          .join(' - '),
    );
    const cvEducations = this.mapItems(
      seeker?.CvEducation,
      (item) =>
        [item.degree, item.major, item.school, item.description]
          .filter(Boolean)
          .join(' - '),
    );
    const seekerEducations = this.mapItems(
      seeker?.SeekerEducation,
      (item) =>
        [
          item.certificate_degree_name,
          item.major,
          item.institute_university_name,
          item.cgpa ? `GPA ${item.cgpa}` : null,
        ]
          .filter(Boolean)
          .join(' - '),
    );
    const cvCertificates = this.mapItems(
      seeker?.CvCertificate,
      (item) => [item.title, item.issuer].filter(Boolean).join(' - '),
    );
    const seekerCertificates = this.mapItems(
      seeker?.SeekerCertificate,
      (item) =>
        [
          item.certificate_name,
          item.certificate_type,
          item.issuing_organization,
          item.score,
        ]
          .filter(Boolean)
          .join(' - '),
    );
    const cvProjects = this.mapItems(
      seeker?.CvProject,
      (item) =>
        [item.name, item.role, item.description, item.link]
          .filter(Boolean)
          .join(' - '),
    );
    const seekerProjects = this.mapItems(
      seeker?.SeekerProject,
      (item) =>
        [
          item.project_name,
          item.role,
          item.technologies,
          item.project_description,
          item.project_url,
        ]
          .filter(Boolean)
          .join(' - '),
    );
    const cvPersonalities = this.mapItems(
      seeker?.CvPersonality,
      (item) => [item.type, item.description].filter(Boolean).join(' - '),
    );
    const seekerPersonalities = this.mapItems(
      seeker?.SeekerPersonality,
      (item) => [item.name, item.description].filter(Boolean).join(' - '),
    );
    const profileSummary = seeker?.SeekerProfileSummary;
    return [
      this.formatLine('Application ID', activity.application_id),
      this.formatLine('Ho ten', user?.full_name),
      this.formatLine('Email', user?.email),
      this.formatLine('So dien thoai', user?.phone),
      this.formatLine('Cover letter', activity.cover_letter),
      this.formatLine('CV URL', activity.cv_url ?? seeker?.file_cv),
      this.formatLine('Github', seeker?.github_url),
      this.formatLine('LinkedIn', seeker?.linkedin_url),
      this.formatLine('Portfolio', seeker?.portfolio_url),
      this.formatLine('Ky nang CV', cvSkills.join(', ')),
      this.formatLine('Ky nang seeker', seekerSkills.join(', ')),
      this.formatLine('Kinh nghiem CV', cvExperiences.join('\n')),
      this.formatLine('Kinh nghiem seeker', seekerExperiences.join('\n')),
      this.formatLine('Hoc van CV', cvEducations.join('\n')),
      this.formatLine('Hoc van seeker', seekerEducations.join('\n')),
      this.formatLine('Chung chi CV', cvCertificates.join('\n')),
      this.formatLine('Chung chi seeker', seekerCertificates.join('\n')),
      this.formatLine('Du an CV', cvProjects.join('\n')),
      this.formatLine('Du an seeker', seekerProjects.join('\n')),
      this.formatLine('Tinh cach CV', cvPersonalities.join('\n')),
      this.formatLine('Tinh cach seeker', seekerPersonalities.join('\n')),
      this.formatLine('Gioi thieu', profileSummary?.about_me),
      this.formatLine('Diem manh', profileSummary?.strengths),
      this.formatLine('Muc tieu nghe nghiep', profileSummary?.career_objective),
      this.formatLine('Tinh cach', profileSummary?.personality_traits),
      this.formatLine('Thai do lam viec', profileSummary?.work_attitude),
      this.formatLine(
        'Moi truong mong muon',
        profileSummary?.preferred_work_environment,
      ),
    ]
      .filter(Boolean)
      .join('\n');
  }

  private formatLine(label: string, value: unknown) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return `${label}: ${String(value)}`;
  }

  private mapItems(
    items: any[] | null | undefined,
    mapper: (item: any) => string,
  ) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map(mapper).map((item) => item.trim()).filter(Boolean);
  }

  private formatDateRange(startDate?: Date | string | null, endDate?: Date | string | null) {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);

    if (!start && !end) {
      return null;
    }

    return `${start || '?'} - ${end || 'hien tai'}`;
  }

  private formatDate(value?: Date | string | null) {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString().slice(0, 10);
  }

  private buildPrompt(jobDocument: string, candidateDocument: string) {
    return `
Bạn là chuyên gia tuyển dụng IT.

Nhiệm vụ:
- Đánh giá mức độ phù hợp giữa CV ứng viên và bài đăng tuyển dụng.
- Không chỉ đếm kỹ năng trùng nhau.
- Phải đọc ngữ cảnh bài đăng tuyển dụng.
- Các từ "bắt buộc", "yêu cầu", "cần có", "must-have" là tiêu chí quan trọng.
- Các từ "ưu tiên", "lợi thế", "nice-to-have" là tiêu chí phụ.
- Không tự suy diễn kỹ năng nếu CV không ghi rõ.
- Không tự động loại ứng viên.
- Trả về tiếng Việt.
- Chỉ trả JSON hợp lệ, không markdown, không giải thích ngoài JSON.

Quy tắc recommendation:
- STRONG_MATCH: score >= 85
- MATCH: score từ 70 đến 84
- NEEDS_REVIEW: score từ 50 đến 69
- LOW_MATCH: score < 50

JSON bắt buộc:
{
  "score": 0,
  "recommendation": "STRONG_MATCH",
  "summary": "Tóm tắt ngắn bằng tiếng Việt",
  "strengths": ["Điểm mạnh phù hợp với bài đăng"],
  "concerns": ["Điểm thiếu hoặc rủi ro cần xem xét"]
}

Bài đăng tuyển dụng:
${jobDocument}

CV ứng viên:
${candidateDocument}
`.trim();
  }

  private buildJudgePrompt(
    jobCriteria: JobCriteria,
    candidateProfile: CandidateProfile,
    ruleResult: RuleScoreResult,
  ) {
    const { rawCandidateDocument: _rawCandidateDocument, ...judgeProfile } =
      candidateProfile;

    return `
Bạn là chuyên gia tuyển dụng IT.
Backend đã tính Rule Score bằng công thức và trọng số động theo JD.
Bạn KHÔNG được thay thế Rule Score.
Bạn chỉ đánh giá bổ sung theo ngữ cảnh.
Hãy xem ứng viên có phù hợp với vai trò, cấp bậc, kỹ năng, lĩnh vực nghiệp vụ, dự án, tiếng Anh và trọng số ưu tiên của JD hay không.

Bạn nhận được:
1. JD criteria JSON
2. Candidate profile JSON
3. Dynamic weights đã normalize
4. Weight reasoning
5. Rule Score
6. Score breakdown
7. Flags

Luật:
- Không chọn ứng viên mạnh nhất tuyệt đối.
- Chọn ứng viên phù hợp nhất với JD.
- Không tự suy diễn kỹ năng nếu CV không ghi rõ.
- Nếu thiếu điều kiện bắt buộc quan trọng thì llmScore không quá 69.
- Chỉ đánh giá lĩnh vực nghiệp vụ khi jobCriteria.domain có giá trị hoặc tiêu chí domain trong scoreBreakdown có điểm.
- Nếu JD không yêu cầu lĩnh vực nghiệp vụ cụ thể thì KHÔNG được đưa việc thiếu kinh nghiệm lĩnh vực nghiệp vụ vào concerns.
- Nếu JD ưu tiên lĩnh vực nghiệp vụ mà ứng viên có kinh nghiệm phù hợp thì đánh giá tích cực.
- Nếu JD ưu tiên tiếng Anh mà ứng viên không có bằng chứng tiếng Anh thì phải nêu concern.
- Nếu JD ưu tiên project/portfolio mà ứng viên có project liên quan thì đánh giá tích cực.
- Nếu ứng viên vượt quá xa yêu cầu thì thêm riskFlag "possibly_overqualified", không loại.
- Nếu thông tin không đủ thì thêm "insufficient_information".
- Chỉ trả JSON hợp lệ bằng tiếng Việt.

JSON output:
{
  "llmScore": 0,
  "summary": "",
  "strengths": [],
  "concerns": [],
  "riskFlags": [],
  "recommendation": "",
  "fitLabel": "Rất phù hợp | Phù hợp | Cần xem xét | Ít phù hợp"
}

Dữ liệu đánh giá:
${JSON.stringify(
  {
    jobCriteria,
    candidateProfile: judgeProfile,
    suggestedWeights: jobCriteria.suggestedWeights,
    weights: ruleResult.weights,
    weightReasoning: ruleResult.weightReasoning,
    ruleScore: ruleResult.ruleScore,
    scoreBreakdown: ruleResult.breakdown,
    flags: ruleResult.flags,
  },
  null,
  2,
)}
`.trim();
  }

  private buildDynamicScreeningRawResult(
    jobCriteria: JobCriteria,
    candidateProfile: CandidateProfile,
    ruleResult: RuleScoreResult,
    llmScore: number,
    finalScore: number,
    riskFlags: string[],
    llmJudgeStatus: LlmJudgeStatus,
    screeningMode: ScreeningMode,
    judgeTopN: number | null,
    llmJudge: Record<string, any>,
  ) {
    return {
      version: 'ai-screening-v2-dynamic-weights',
      jobCriteria,
      candidateProfile,
      weights: ruleResult.weights,
      weightReasoning: ruleResult.weightReasoning,
      ruleScore: ruleResult.ruleScore,
      llmScore,
      finalScore,
      screeningMode,
      judgeTopN,
      llmJudgeStatus,
      scoreBreakdown: ruleResult.breakdown,
      flags: ruleResult.flags,
      riskFlags,
      llmJudge,
    };
  }

  private mergeJudgeRiskFlags(ruleFlags: string[], llmRiskFlags: string[]) {
    const riskFlags: string[] = [];

    if (ruleFlags.includes('possibly_overqualified')) {
      riskFlags.push('possibly_overqualified');
    }

    if (
      ruleFlags.includes('missing_information') ||
      llmRiskFlags.includes('missing_information') ||
      llmRiskFlags.includes('insufficient_information')
    ) {
      riskFlags.push('insufficient_information');
    }

    if (llmRiskFlags.includes('llm_judge_failed')) {
      riskFlags.push('llm_judge_failed');
    }

    if (llmRiskFlags.includes('llm_judge_skipped_fast_mode')) {
      riskFlags.push('llm_judge_skipped_fast_mode');
    }

    if (llmRiskFlags.includes('llm_judge_skipped_not_top_n')) {
      riskFlags.push('llm_judge_skipped_not_top_n');
    }

    return riskFlags;
  }

  private normalizeLlmJudgeStatus(value: unknown): LlmJudgeStatus {
    return value === 'success' ||
      value === 'failed' ||
      value === 'skipped_fast_mode' ||
      value === 'skipped_not_top_n'
      ? value
      : 'failed';
  }

  private getVietnameseFitLabel(score: number) {
    if (score >= 85) return 'Rất phù hợp';
    if (score >= 70) return 'Phù hợp';
    if (score >= 50) return 'Cần xem xét';
    return 'Ít phù hợp';
  }

  private buildJobCriteriaPrompt(jobDocument: string) {
    return `
Bạn là hệ thống phân tích bài đăng tuyển dụng IT.

Nhiệm vụ:
Đọc JD tuyển dụng và trích xuất tiêu chí đánh giá ứng viên.
Bạn KHÔNG được chấm điểm ứng viên.
Bạn KHÔNG được tính Rule Score.
Bạn KHÔNG được tính Final Score.
Bạn chỉ phân tích JD và đề xuất trọng số đánh giá.

Luật tạo suggestedWeights:
1. Tổng suggestedWeights phải bằng 100.
2. Nhóm nào JD nhấn mạnh nhiều thì trọng số cao hơn.
3. Tiêu chí bắt buộc luôn quan trọng hơn tiêu chí ưu tiên.
4. Nếu JD yêu cầu domain cụ thể như banking, healthcare, fintech, ecommerce thì domain phải có trọng số đáng kể.
5. Nếu JD yêu cầu giao tiếp tiếng Anh với khách hàng/quốc tế thì englishEducationCertificate phải cao.
6. Nếu JD nhấn mạnh portfolio, sản phẩm thực tế, project, cuộc thi thì projectContest phải cao.
7. Không nhóm nào vượt quá 40 điểm.
8. Nếu không chắc chắn, hãy phân bổ cân bằng theo role và level.
9. Chỉ trả JSON hợp lệ, không giải thích ngoài JSON.
10. Mọi nội dung dùng để hiển thị cho người dùng, đặc biệt weightReasoning, phải viết bằng tiếng Việt.

Cách suy luận trọng số:
- Nếu JD nhắc nhiều Java/Spring/React/Flutter/Python/... thì mainTechnicalSkillYears cao.
- Nếu JD nhắc nhiều API/Microservice/System Design/Core Skill thì apiOrCoreSkillYears cao.
- Nếu JD có nhiều từ "must", "required", "mandatory", "at least" thì requiredSkills cao.
- Nếu JD có "nice to have", "preferred", "plus" thì preferredSkills thấp hơn requiredSkills.
- Nếu JD nhấn mạnh domain như banking, fintech, healthcare, ecommerce thì domain cao.
- Nếu JD nhấn mạnh English communication, global clients, Japanese/US clients thì englishEducationCertificate cao.
- Nếu JD nhấn mạnh project, portfolio, contest, production product thì projectContest cao.

Cách suy luận role:
- Backend, Java, Spring Boot, API thường là backend.
- Frontend, React, Vue, Angular thường là frontend.
- Fullstack là fullstack.
- DevOps, Cloud, Kubernetes là devops hoặc cloud_platform.
- QA, Tester là qa_manual hoặc qa_automation.
- Data Engineer là data_engineer.
- AI/ML Engineer là ai_ml_engineer.
- Nếu không chắc dùng other.

Cách suy luận level:
- Intern/Fresher nếu yêu cầu 0-1 năm.
- Junior nếu yêu cầu khoảng 1-2 năm.
- Middle nếu yêu cầu khoảng 2-4 năm.
- Senior nếu yêu cầu khoảng 4-7 năm.
- Lead nếu yêu cầu khoảng 6-9 năm hoặc có dẫn nhóm.
- Architect/Manager nếu yêu cầu thiết kế hệ thống cấp cao hoặc quản lý.
- Nếu JD không ghi rõ số năm thì để null.

JSON bắt buộc:
{
  "role": "backend | frontend | fullstack | mobile | devops | cloud_platform | qa_manual | qa_automation | data_analyst | data_engineer | ai_ml_engineer | mlops_ai_lead | business_analyst | product_owner | product_manager | head_of_product | ui_ux | other",
  "level": "intern | fresher | junior | middle | senior | lead | manager | architect | head | other",
  "requiredYears": {
    "totalExperience": null,
    "mainSkillYears": null,
    "apiYears": null,
    "domainYears": null
  },
  "mainSkillKeywords": [],
  "apiOrCoreSkillKeywords": [],
  "requiredSkills": [],
  "preferredSkills": [],
  "domain": null,
  "englishRequirement": null,
  "educationRequirement": null,
  "certificates": [],
  "projectKeywords": [],
  "suggestedWeights": {
    "totalExperience": 0,
    "mainTechnicalSkillYears": 0,
    "apiOrCoreSkillYears": 0,
    "requiredSkills": 0,
    "preferredSkills": 0,
    "domain": 0,
    "englishEducationCertificate": 0,
    "projectContest": 0
  },
  "weightReasoning": {
    "totalExperience": "",
    "mainTechnicalSkillYears": "",
    "apiOrCoreSkillYears": "",
    "requiredSkills": "",
    "preferredSkills": "",
    "domain": "",
    "englishEducationCertificate": "",
    "projectContest": ""
  }
}

Ví dụ suggestedWeights với JD Banking Backend:
{
  "suggestedWeights": {
    "totalExperience": 10,
    "mainTechnicalSkillYears": 25,
    "apiOrCoreSkillYears": 20,
    "requiredSkills": 15,
    "preferredSkills": 10,
    "domain": 15,
    "englishEducationCertificate": 3,
    "projectContest": 2
  }
}

Ví dụ suggestedWeights với JD làm việc trực tiếp với khách hàng quốc tế:
{
  "suggestedWeights": {
    "totalExperience": 10,
    "mainTechnicalSkillYears": 18,
    "apiOrCoreSkillYears": 10,
    "requiredSkills": 15,
    "preferredSkills": 5,
    "domain": 7,
    "englishEducationCertificate": 25,
    "projectContest": 10
  }
}

Bài đăng tuyển dụng:
${jobDocument}
`.trim();
  }

  private parseAiResponse(rawText: unknown): AiScreeningResult {
    if (typeof rawText !== 'string') {
      return this.getFallbackResult('AI không trả về nội dung hợp lệ.');
    }

    try {
      const parsed = this.safeParseAiJson(rawText);

      if (parsed === undefined) {
        return this.getFallbackResult('Không thể đọc kết quả AI.');
      }

      if (!this.isRecord(parsed)) {
        return this.getFallbackResult('AI trả JSON không đúng định dạng.');
      }

      const score = this.clampScore(parsed.llmScore ?? parsed.score);
      const recommendation = this.normalizeRecommendation(
        parsed.recommendation,
        score,
      );

      return {
        score,
        recommendation,
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : 'Không có tóm tắt từ AI.',
        strengths: this.normalizeStringArray(parsed.strengths),
        concerns: this.normalizeStringArray(parsed.concerns),
        rawResult: parsed,
        model: this.model,
        isFallback: false,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown AI parse error';

      this.logger.warn(`AI response parse failed: ${message}`);
      return this.getFallbackResult('Không thể đọc kết quả AI.');
    }
  }

  safeParseAiJson(rawText: unknown): unknown {
    if (typeof rawText !== 'string') {
      return undefined;
    }

    try {
      return JSON.parse(rawText) as unknown;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown AI parse error';

      this.logger.warn(`AI response parse failed: ${message}`);
      return undefined;
    }
  }

  private isRecord(value: unknown): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private normalizeStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  clampScore(score: unknown) {
    const numericScore = Number(score);

    if (!Number.isFinite(numericScore)) {
      return 0;
    }

    return Math.round(Math.min(100, Math.max(0, numericScore)));
  }

  private normalizeRecommendation(
    recommendation: unknown,
    score: number,
  ): AiScreeningRecommendation {
    const expectedRecommendation = this.mapScoreToRecommendation(score);

    if (recommendation === expectedRecommendation) {
      return expectedRecommendation;
    }

    return expectedRecommendation;
  }

  private mapScoreToRecommendation(score: number): AiScreeningRecommendation {
    return this.classifyFitLabel(score);
  }

  private getFallbackResult(message: string): AiScreeningResult {
    return {
      score: 0,
      recommendation: this.mapScoreToRecommendation(0),
      summary: message,
      strengths: [],
      concerns: [message],
      rawResult: {},
      model: this.model,
      isFallback: true,
      errorMessage: message,
    };
  }
}

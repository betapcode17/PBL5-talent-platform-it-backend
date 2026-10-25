import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from './generated/prisma/client.js';

const ID_FIELDS: Record<string, string> = {
  User: 'user_id',
  Token: 'token_id',
  Category: 'category_id',
  Company: 'company_id',
  EmployerRegistrationRequest: 'request_id',
  CompanyFollow: 'follow_id',
  CompanySeekerLike: 'company_seeker_like_id',
  Chat: 'chat_id',
  InterviewSchedule: 'id',
  Interview: 'interview_id',
  JobBookmark: 'job_bookmark_id',
  JobPost: 'job_post_id',
  JobAiCriteriaCache: 'id',
  AiScreeningRun: 'id',
  JobPostActivity: 'application_id',
  JobPostSkill: 'id',
  JobType: 'job_type_id',
  Message: 'message_id',
  Skill: 'skill_id',
  AiConversation: 'ai_conversation_id',
  ConversationMessage: 'conversation_message_id',
  Notification: 'notification_id',
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const dbUrl = configService.get<string>('DATABASE_URL');
    super(dbUrl ? { datasourceUrl: dbUrl } : {});

    const getNextSequence = (modelName: string, count = 1): Promise<number> => {
      return this.getNextSequence(modelName, count);
    };

    const extended = this.$extends({
      query: {
        $allModels: {
          async create({ model, args, query }: { model: string; args: any; query: any }) {
            const pkField = ID_FIELDS[model];
            if (pkField && args.data && args.data[pkField] == null) {
              args.data[pkField] = await getNextSequence(model);
            }
            return query(args);
          },
          async createMany({ model, args, query }: { model: string; args: any; query: any }) {
            const pkField = ID_FIELDS[model];
            if (pkField && Array.isArray(args.data)) {
              const needId = args.data.filter((item: any) => item[pkField] == null);
              if (needId.length > 0) {
                const endId = await getNextSequence(model, needId.length);
                let currentId = endId - needId.length + 1;
                for (const item of needId) {
                  item[pkField] = currentId++;
                }
              }
            }
            return query(args);
          },
        },
      },
    });

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in extended) {
          const val = (extended as any)[prop];
          return typeof val === 'function' ? val.bind(extended) : val;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to MongoDB Atlas via Prisma');
    await this.syncCounters();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async getNextSequence(modelName: string, count = 1): Promise<number> {
    let retries = 5;
    while (retries > 0) {
      try {
        const counter = await (this as any).counter.upsert({
          where: { id: modelName },
          update: { seq: { increment: count } },
          create: { id: modelName, seq: count },
        });
        return counter.seq;
      } catch (err: any) {
        retries--;
        if (retries === 0 || err?.code !== 'P2034') throw err;
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 60 + 20));
      }
    }
    throw new Error(`Failed to get next sequence for ${modelName}`);
  }

  private async syncCounters() {
    await Promise.allSettled(
      Object.entries(ID_FIELDS).map(async ([modelName, pkField]) => {
        const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        const delegate = (this as any)[delegateName];
        if (delegate && typeof delegate.findFirst === 'function') {
          try {
            const topRecord = await delegate.findFirst({
              orderBy: { [pkField]: 'desc' },
              select: { [pkField]: true },
            });
            const maxId = topRecord?.[pkField] ?? 0;
            if (maxId > 0) {
              const currentCounter = await (this as any).counter.findUnique({
                where: { id: modelName },
              });
              if (!currentCounter || currentCounter.seq < maxId) {
                await (this as any).counter.upsert({
                  where: { id: modelName },
                  update: { seq: maxId },
                  create: { id: modelName, seq: maxId },
                });
              }
            }
          } catch (err) {
            this.logger.warn(`Could not sync counter for ${modelName}: ${err}`);
          }
        }
      }),
    );
  }
}

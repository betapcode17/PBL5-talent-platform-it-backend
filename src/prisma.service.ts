import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  resetToken: any;
  constructor(private configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const dbUrl = configService.get<string>('DATABASE_URL');

    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    const adapter = new PrismaPg({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      connectionString: dbUrl,
    });

    super({ adapter });
  }
}

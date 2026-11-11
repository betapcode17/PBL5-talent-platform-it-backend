import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JobsController } from '../src/jobs/jobs.controller.js';
import { JobsService } from '../src/jobs/jobs.service.js';

describe('GET /jobs/search (validation e2e)', () => {
  let app: INestApplication;
  let jobsServiceMock: any;

  beforeEach(async () => {
    jobsServiceMock = {
      searchJobs: jest.fn().mockResolvedValue({ jobs: [], total: 0 }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [{ provide: JobsService, useValue: jobsServiceMock }],
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows query with q = 100 characters', () => {
    const q100 = 'a'.repeat(100);
    return request(app.getHttpServer())
      .get(`/jobs/search?q=${q100}`)
      .expect(200);
  });

  it('rejects query with q = 101 characters with 400 Bad Request', async () => {
    const q101 = 'a'.repeat(101);
    const res = await request(app.getHttpServer())
      .get(`/jobs/search?q=${q101}`)
      .expect(400);

    expect(res.body.message).toContain(
      'Từ khóa tìm kiếm không được vượt quá 100 ký tự',
    );
  });
});

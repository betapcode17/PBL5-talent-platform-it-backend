import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CloudinaryService } from '../upload/cloudinary.service.js';
import { CvService, CvUploadFile } from './cv.service.js';

type PrismaMock = {
  user: { findUnique: jest.Mock };
  seeker: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  cvEducation: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  cvSkill: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  cvPersonality: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  cvCertificate: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  cvProject: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('CvService', () => {
  let service: CvService;
  let prisma: PrismaMock;
  let cloudinary: { uploadCvFile: jest.Mock; uploadCertificateFile: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      seeker: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cvEducation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cvSkill: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cvPersonality: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cvCertificate: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cvProject: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: PrismaMock) => unknown) =>
        callback(prisma),
      ),
    };

    prisma.user.findUnique.mockResolvedValue({
      user_id: 1,
      role: 'SEEKER',
      is_active: true,
    });
    prisma.seeker.findUnique.mockResolvedValue({ seeker_id: 1 });

    cloudinary = {
      uploadCvFile: jest.fn(),
      uploadCertificateFile: jest.fn(),
    };

    service = new CvService(
      prisma as unknown as PrismaService,
      cloudinary as unknown as CloudinaryService,
    );
  });

  it('returns full CV without sensitive user fields', async () => {
    prisma.seeker.findUnique.mockResolvedValue({
      seeker_id: 1,
      file_cv: 'https://example.com/cv.pdf',
      User: {
        user_id: 1,
        full_name: 'Nguyen Van A',
        email: 'seeker@example.com',
      },
      CvEducation: [],
      CvExperience: [],
      CvSkill: [],
      CvPersonality: [],
      CvCertificate: [],
      CvProject: [],
    });

    const result = await service.findOne(1, {
      sub: 1,
      role: 'SEEKER',
    });

    expect(result).toEqual({
      id: 1,
      userId: 1,
      cvUrl: 'https://example.com/cv.pdf',
      seeker: {
        id: 1,
        fullName: 'Nguyen Van A',
        email: 'seeker@example.com',
      },
      educations: [],
      experiences: [],
      skills: [],
      personalities: [],
      certificates: [],
      projects: [],
    });
    expect(result).not.toHaveProperty('password');
  });

  it('throws forbidden when seeker views another seeker CV', async () => {
    await expect(
      service.findOne(2, {
        sub: 1,
        role: 'SEEKER',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.seeker.findUnique).not.toHaveBeenCalled();
  });

  it('rejects CV files larger than 5MB', () => {
    const file = createFile({
      size: 5 * 1024 * 1024 + 1,
      mimetype: 'application/pdf',
      originalname: 'cv.pdf',
    });

    expect(() => service.validateCvFile(file)).toThrow(BadRequestException);
  });

  it('rejects invalid CV file types', () => {
    const file = createFile({
      size: 1024,
      mimetype: 'image/png',
      originalname: 'cv.png',
    });

    expect(() => service.validateCvFile(file)).toThrow(BadRequestException);
  });

  it('rejects date ranges where startDate is not before endDate', () => {
    expect(() => service.validateDateRange('2026-06-01', '2022-09-01')).toThrow(
      BadRequestException,
    );
  });

  it('rejects duplicate skills in the same CV', async () => {
    prisma.cvSkill.count.mockResolvedValue(0);
    prisma.cvSkill.findMany.mockResolvedValue([{ name: 'NestJS' }]);

    await expect(
      service.createSkills(
        { sub: 1, role: 'SEEKER' },
        { skills: ['NestJS', 'PostgreSQL'] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate skills in the same request', async () => {
    await expect(
      service.createSkills(
        { sub: 1, role: 'SEEKER' },
        { skills: ['NestJS', 'nestjs'] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws forbidden when updating another seeker education', async () => {
    prisma.cvEducation.findUnique.mockResolvedValue({
      id: 'education-1',
      userId: 2,
      startDate: new Date('2022-09-01'),
      endDate: new Date('2026-06-01'),
    });

    await expect(
      service.updateEducation({ sub: 1, role: 'SEEKER' }, 'education-1', {
        school: 'Other University',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws not found when deleting missing education', async () => {
    prisma.cvEducation.findUnique.mockResolvedValue(null);

    await expect(
      service.deleteEducation({ sub: 1, role: 'SEEKER' }, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses Prisma skip/take for education pagination', async () => {
    prisma.cvEducation.findMany.mockResolvedValue([{ id: 'education-1' }]);
    prisma.cvEducation.count.mockResolvedValue(12);

    const result = await service.listEducations(
      { sub: 1, role: 'SEEKER' },
      { page: 2, limit: 5 },
    );

    expect(prisma.cvEducation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      }),
    );
    expect(result).toEqual({
      educations: [{ id: 'education-1' }],
      total: 12,
      page: 2,
      limit: 5,
    });
  });

  it('creates personality for the current seeker CV', async () => {
    prisma.cvPersonality.create.mockResolvedValue({ id: 'personality-1' });

    await expect(
      service.createPersonality(
        { sub: 1, role: 'SEEKER' },
        {
          type: 'MBTI',
          description: 'INTJ - Logical and strategic thinker',
        },
      ),
    ).resolves.toEqual({ id: 'personality-1' });
    expect(prisma.cvPersonality.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        type: 'MBTI',
        description: 'INTJ - Logical and strategic thinker',
      },
      select: { id: true },
    });
  });

  it('creates certificate for the current seeker CV', async () => {
    prisma.cvCertificate.create.mockResolvedValue({ id: 'certificate-1' });

    await expect(
      service.createCertificate(
        { sub: 1, role: 'SEEKER' },
        {
          title: 'AWS Cloud Practitioner',
          issuer: 'Amazon Web Services',
          issuedDate: '2025-01-01',
          fileUrl: 'https://example.com/certificate.pdf',
        },
      ),
    ).resolves.toEqual({ id: 'certificate-1' });
    expect(prisma.cvCertificate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          title: 'AWS Cloud Practitioner',
          issuer: 'Amazon Web Services',
          fileUrl: 'https://example.com/certificate.pdf',
        }),
      }),
    );
  });

  it('rejects certificate URLs with unsupported protocols', async () => {
    await expect(
      service.createCertificate(
        { sub: 1, role: 'SEEKER' },
        {
          title: 'AWS Cloud Practitioner',
          issuer: 'Amazon Web Services',
          fileUrl: 'ftp://example.com/certificate.pdf',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.cvCertificate.create).not.toHaveBeenCalled();
  });

  it('rejects invalid certificate upload file types', async () => {
    const file = createFile({
      mimetype: 'application/x-msdownload',
      originalname: 'certificate.exe',
    });

    await expect(
      service.createCertificate(
        { sub: 1, role: 'SEEKER' },
        {
          title: 'AWS Cloud Practitioner',
          issuer: 'Amazon Web Services',
        },
        file,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.uploadCertificateFile).not.toHaveBeenCalled();
    expect(prisma.cvCertificate.create).not.toHaveBeenCalled();
  });

  it('creates project with a valid link', async () => {
    prisma.cvProject.create.mockResolvedValue({ id: 'project-1' });

    await expect(
      service.createProject(
        { sub: 1, role: 'SEEKER' },
        {
          name: 'IT Job Platform',
          link: 'https://github.com/example/it-job-platform',
          startDate: '2026-01-01',
          endDate: '2026-04-01',
        },
      ),
    ).resolves.toEqual({ id: 'project-1' });
  });

  it('rejects project with invalid link', async () => {
    await expect(
      service.createProject(
        { sub: 1, role: 'SEEKER' },
        {
          name: 'IT Job Platform',
          link: 'not-a-url',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.cvProject.create).not.toHaveBeenCalled();
  });

  it('rejects project when startDate is after endDate', async () => {
    await expect(
      service.createProject(
        { sub: 1, role: 'SEEKER' },
        {
          name: 'IT Job Platform',
          startDate: '2026-04-01',
          endDate: '2026-01-01',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws forbidden when updating another seeker project', async () => {
    prisma.cvProject.findUnique.mockResolvedValue({
      id: 'project-1',
      userId: 2,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-04-01'),
    });

    await expect(
      service.updateProject({ sub: 1, role: 'SEEKER' }, 'project-1', {
        name: 'Other Project',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws forbidden when deleting another seeker personality', async () => {
    prisma.cvPersonality.findUnique.mockResolvedValue({
      id: 'personality-1',
      userId: 2,
    });

    await expect(
      service.deletePersonality({ sub: 1, role: 'SEEKER' }, 'personality-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createFile(overrides: Partial<CvUploadFile>): CvUploadFile {
  return {
    buffer: Buffer.from('test'),
    size: 1024,
    mimetype: 'application/pdf',
    originalname: 'cv.pdf',
    ...overrides,
  };
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CloudinaryService } from '../upload/cloudinary.service.js';
import { CreateCertificateDto } from './dto/create-certificate.dto.js';
import { CreateEducationDto } from './dto/create-education.dto.js';
import { CreateExperienceDto } from './dto/create-experience.dto.js';
import { CreatePersonalityDto } from './dto/create-personality.dto.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { CreateSkillsDto } from './dto/create-skills.dto.js';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
import { UpdateCertificateDto } from './dto/update-certificate.dto.js';
import { UpdateEducationDto } from './dto/update-education.dto.js';
import { UpdateExperienceDto } from './dto/update-experience.dto.js';
import { UpdatePersonalityDto } from './dto/update-personality.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { UpdateSkillDto } from './dto/update-skill.dto.js';

type RequestUser = {
  sub: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
  email?: string;
};

type CvOwnerModelName = 'personality' | 'certificate' | 'project';

export type CvUploadFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

const MAX_CV_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_CV_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_CV_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);
const MAX_CERTIFICATE_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_CERTIFICATE_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
]);
const ALLOWED_CERTIFICATE_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
]);
const MAX_SKILLS_PER_CV = 20;

@Injectable()
export class CvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findOne(id: number, user: RequestUser) {
    this.ensureCanViewCv(id, user);

    const cv = await this.prisma.seeker.findUnique({
      where: { seeker_id: id },
      select: {
        seeker_id: true,
        file_cv: true,
        User: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
        CvEducation: {
          orderBy: { startDate: 'desc' },
        },
        CvExperience: {
          orderBy: { startDate: 'desc' },
        },
        CvSkill: {
          orderBy: { name: 'asc' },
        },
        CvPersonality: {
          orderBy: { createdAt: 'desc' },
        },
        CvCertificate: {
          orderBy: { issuedDate: 'desc' },
        },
        CvProject: {
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!cv) {
      throw new NotFoundException('CV khong ton tai');
    }

    return {
      id: cv.seeker_id,
      userId: cv.User.user_id,
      cvUrl: cv.file_cv,
      seeker: {
        id: cv.User.user_id,
        fullName: cv.User.full_name,
        email: cv.User.email,
      },
      educations: cv.CvEducation.map((item) => ({
        id: item.id,
        school: item.school,
        degree: item.degree,
        major: item.major,
        startDate: item.startDate,
        endDate: item.endDate,
        description: item.description,
      })),
      experiences: cv.CvExperience.map((item) => ({
        id: item.id,
        company: item.company,
        position: item.position,
        startDate: item.startDate,
        endDate: item.endDate,
        description: item.description,
      })),
      skills: cv.CvSkill.map((item) => ({
        id: item.id,
        name: item.name,
      })),
      personalities: cv.CvPersonality.map((item) => ({
        id: item.id,
        type: item.type,
        description: item.description,
      })),
      certificates: cv.CvCertificate.map((item) => ({
        id: item.id,
        title: item.title,
        issuer: item.issuer,
        issuedDate: item.issuedDate,
        fileUrl: item.fileUrl,
      })),
      projects: cv.CvProject.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        link: item.link,
        role: item.role,
        startDate: item.startDate,
        endDate: item.endDate,
      })),
    };
  }

  async uploadCvFile(user: RequestUser, file?: CvUploadFile) {
    if (!user) {
      throw new UnauthorizedException('Chua dang nhap');
    }

    if (user.role !== 'SEEKER') {
      throw new ForbiddenException('Seeker only');
    }

    this.validateCvFile(file);

    const seekerId = await this.getOrCreateMyCv(user.sub);
    const { url } = await this.cloudinary.uploadCvFile(file);

    // TODO: Add OCR parsing after upload when CV extraction is required.
    await this.prisma.seeker.update({
      where: { seeker_id: seekerId },
      data: {
        file_cv: url,
        updated_date: new Date(),
      },
    });

    return { cvUrl: url };
  }

  async createEducation(user: RequestUser, dto: CreateEducationDto) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    this.validateDateRange(dto.startDate, dto.endDate);

    const education = await this.prisma.cvEducation.create({
      data: {
        userId: seekerId,
        school: dto.school,
        degree: dto.degree,
        major: dto.major,
        startDate: this.toDate(dto.startDate),
        endDate: this.toOptionalDate(dto.endDate),
        description: dto.description,
      },
      select: { id: true },
    });

    return { educationId: education.id };
  }

  async listEducations(user: RequestUser, query: PaginationQueryDto) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [educations, total] = await Promise.all([
      this.prisma.cvEducation.findMany({
        where: { userId: seekerId },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cvEducation.count({
        where: { userId: seekerId },
      }),
    ]);

    return { educations, total, page, limit };
  }

  async updateEducation(
    user: RequestUser,
    id: string,
    dto: UpdateEducationDto,
  ) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const education = await this.prisma.cvEducation.findUnique({
      where: { id },
    });

    this.ensureOwner(education, seekerId, 'Education khong ton tai');

    const nextStartDate = dto.startDate
      ? this.toDate(dto.startDate)
      : education.startDate;
    const nextEndDate =
      dto.endDate === undefined
        ? education.endDate
        : this.toOptionalDate(dto.endDate);
    this.validateDateRange(nextStartDate, nextEndDate);

    const updated = await this.prisma.cvEducation.update({
      where: { id },
      data: {
        school: dto.school,
        degree: dto.degree,
        major: dto.major,
        startDate: dto.startDate ? this.toDate(dto.startDate) : undefined,
        endDate:
          dto.endDate === undefined
            ? undefined
            : this.toOptionalDate(dto.endDate),
        description: dto.description,
      },
    });

    return { updated };
  }

  async deleteEducation(user: RequestUser, id: string) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const education = await this.prisma.cvEducation.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    this.ensureOwner(education, seekerId, 'Education khong ton tai');

    await this.prisma.cvEducation.delete({ where: { id } });

    return { message: 'Deleted' };
  }

  async createExperience(user: RequestUser, dto: CreateExperienceDto) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    this.validateDateRange(dto.startDate, dto.endDate);

    const experience = await this.prisma.cvExperience.create({
      data: {
        userId: seekerId,
        company: dto.company,
        position: dto.position,
        startDate: this.toDate(dto.startDate),
        endDate: this.toOptionalDate(dto.endDate),
        description: dto.description,
      },
      select: { id: true },
    });

    return { experienceId: experience.id };
  }

  async listExperiences(user: RequestUser, query: PaginationQueryDto) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [experiences, total] = await Promise.all([
      this.prisma.cvExperience.findMany({
        where: { userId: seekerId },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cvExperience.count({
        where: { userId: seekerId },
      }),
    ]);

    return { experiences, total, page, limit };
  }

  async updateExperience(
    user: RequestUser,
    id: string,
    dto: UpdateExperienceDto,
  ) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const experience = await this.prisma.cvExperience.findUnique({
      where: { id },
    });

    this.ensureOwner(experience, seekerId, 'Experience khong ton tai');

    const nextStartDate = dto.startDate
      ? this.toDate(dto.startDate)
      : experience.startDate;
    const nextEndDate =
      dto.endDate === undefined
        ? experience.endDate
        : this.toOptionalDate(dto.endDate);
    this.validateDateRange(nextStartDate, nextEndDate);

    const updated = await this.prisma.cvExperience.update({
      where: { id },
      data: {
        company: dto.company,
        position: dto.position,
        startDate: dto.startDate ? this.toDate(dto.startDate) : undefined,
        endDate:
          dto.endDate === undefined
            ? undefined
            : this.toOptionalDate(dto.endDate),
        description: dto.description,
      },
    });

    return { updated };
  }

  async deleteExperience(user: RequestUser, id: string) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const experience = await this.prisma.cvExperience.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    this.ensureOwner(experience, seekerId, 'Experience khong ton tai');

    await this.prisma.cvExperience.delete({ where: { id } });

    return { message: 'Deleted' };
  }

  async createSkills(user: RequestUser, dto: CreateSkillsDto) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const skillNames = this.normalizeSkillNames(dto.skills);

    return this.prisma.$transaction(async (tx) => {
      const currentSkillCount = await tx.cvSkill.count({
        where: { userId: seekerId },
      });

      if (currentSkillCount + skillNames.length > MAX_SKILLS_PER_CV) {
        throw new BadRequestException('Moi CV chi duoc co toi da 20 skills');
      }

      const existingSkills = await tx.cvSkill.findMany({
        where: {
          userId: seekerId,
          OR: skillNames.map((name) => ({
            name: { equals: name, mode: 'insensitive' as const },
          })),
        },
        select: { name: true },
      });

      if (existingSkills.length > 0) {
        throw new BadRequestException('Skill da ton tai trong CV');
      }

      const created = await Promise.all(
        skillNames.map((name) =>
          tx.cvSkill.create({
            data: {
              userId: seekerId,
              name,
            },
            select: { id: true },
          }),
        ),
      );

      return { skillIds: created.map((skill) => skill.id) };
    });
  }

  async listSkills(user: RequestUser) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const skills = await this.prisma.cvSkill.findMany({
      where: { userId: seekerId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });

    return { skills };
  }

  async updateSkill(user: RequestUser, id: string, dto: UpdateSkillDto) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const skill = await this.prisma.cvSkill.findUnique({
      where: { id },
    });

    this.ensureOwner(skill, seekerId, 'Skill khong ton tai');

    const duplicate = await this.prisma.cvSkill.findFirst({
      where: {
        userId: seekerId,
        id: { not: id },
        name: { equals: dto.name, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException('Skill da ton tai trong CV');
    }

    const updated = await this.prisma.cvSkill.update({
      where: { id },
      data: { name: dto.name },
    });

    return { updated };
  }

  async deleteSkill(user: RequestUser, id: string) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const skill = await this.prisma.cvSkill.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    this.ensureOwner(skill, seekerId, 'Skill khong ton tai');

    await this.prisma.cvSkill.delete({ where: { id } });

    return { message: 'Deleted' };
  }

  async createPersonality(user: RequestUser, dto: CreatePersonalityDto) {
    const seekerId = await this.getOrCreateMyCv(user.sub);

    const personality = await this.prisma.cvPersonality.create({
      data: {
        userId: seekerId,
        type: dto.type,
        description: dto.description,
      },
      select: { id: true },
    });

    return { id: personality.id };
  }

  async listPersonalities(user: RequestUser) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const personalities = await this.prisma.cvPersonality.findMany({
      where: { userId: seekerId },
      orderBy: { createdAt: 'desc' },
    });

    return { personalities };
  }

  async updatePersonality(
    user: RequestUser,
    id: string,
    dto: UpdatePersonalityDto,
  ) {
    await this.ensureCvItemOwner(id, user.sub, 'personality');

    const updated = await this.prisma.cvPersonality.update({
      where: { id },
      data: {
        type: dto.type,
        description: dto.description,
      },
    });

    return { updated };
  }

  async deletePersonality(user: RequestUser, id: string) {
    await this.ensureCvItemOwner(id, user.sub, 'personality');
    await this.prisma.cvPersonality.delete({ where: { id } });

    return { message: 'Deleted' };
  }

  async createCertificate(
    user: RequestUser,
    dto: CreateCertificateDto,
    file?: CvUploadFile,
  ) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    this.validateCertificateFile(file);
    this.validateHttpUrl(dto.fileUrl, 'fileUrl khong hop le');

    const uploadedFileUrl = file
      ? (await this.cloudinary.uploadCertificateFile(file)).url
      : undefined;

    const certificate = await this.prisma.cvCertificate.create({
      data: {
        userId: seekerId,
        title: dto.title,
        issuer: dto.issuer,
        issuedDate: this.toOptionalDate(dto.issuedDate),
        fileUrl: uploadedFileUrl || dto.fileUrl,
      },
      select: { id: true },
    });

    return { id: certificate.id };
  }

  async listCertificates(user: RequestUser) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const certificates = await this.prisma.cvCertificate.findMany({
      where: { userId: seekerId },
      orderBy: { issuedDate: 'desc' },
    });

    return { certificates };
  }

  async updateCertificate(
    user: RequestUser,
    id: string,
    dto: UpdateCertificateDto,
  ) {
    await this.ensureCvItemOwner(id, user.sub, 'certificate');
    this.validateHttpUrl(dto.fileUrl, 'fileUrl khong hop le');

    const updated = await this.prisma.cvCertificate.update({
      where: { id },
      data: {
        title: dto.title,
        issuer: dto.issuer,
        issuedDate:
          dto.issuedDate === undefined
            ? undefined
            : this.toOptionalDate(dto.issuedDate),
        fileUrl: dto.fileUrl,
      },
    });

    return { updated };
  }

  async deleteCertificate(user: RequestUser, id: string) {
    await this.ensureCvItemOwner(id, user.sub, 'certificate');
    await this.prisma.cvCertificate.delete({ where: { id } });

    return { message: 'Deleted' };
  }

  async createProject(user: RequestUser, dto: CreateProjectDto) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    this.validateProjectLink(dto.link);
    this.validateDateRange(dto.startDate, dto.endDate);

    const project = await this.prisma.cvProject.create({
      data: {
        userId: seekerId,
        name: dto.name,
        description: dto.description,
        link: dto.link,
        role: dto.role,
        startDate: this.toOptionalDate(dto.startDate),
        endDate: this.toOptionalDate(dto.endDate),
      },
      select: { id: true },
    });

    return { id: project.id };
  }

  async listProjects(user: RequestUser) {
    const seekerId = await this.getOrCreateMyCv(user.sub);
    const projects = await this.prisma.cvProject.findMany({
      where: { userId: seekerId },
      orderBy: { startDate: 'desc' },
    });

    return { projects };
  }

  async updateProject(user: RequestUser, id: string, dto: UpdateProjectDto) {
    await this.ensureCvItemOwner(id, user.sub, 'project');
    const project = await this.prisma.cvProject.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('project khong ton tai');
    }

    this.validateProjectLink(dto.link);

    const nextStartDate =
      dto.startDate === undefined
        ? project.startDate
        : this.toOptionalDate(dto.startDate);
    const nextEndDate =
      dto.endDate === undefined
        ? project.endDate
        : this.toOptionalDate(dto.endDate);
    this.validateDateRange(nextStartDate, nextEndDate);

    const updated = await this.prisma.cvProject.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        link: dto.link,
        role: dto.role,
        startDate:
          dto.startDate === undefined
            ? undefined
            : this.toOptionalDate(dto.startDate),
        endDate:
          dto.endDate === undefined
            ? undefined
            : this.toOptionalDate(dto.endDate),
      },
    });

    return { updated };
  }

  async deleteProject(user: RequestUser, id: string) {
    await this.ensureCvItemOwner(id, user.sub, 'project');
    await this.prisma.cvProject.delete({ where: { id } });

    return { message: 'Deleted' };
  }

  validateCvFile(file?: CvUploadFile): asserts file is CvUploadFile {
    if (!file) {
      throw new BadRequestException('File khong ton tai');
    }

    if (file.size > MAX_CV_FILE_SIZE) {
      throw new BadRequestException('File toi da 5MB');
    }

    const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];

    if (
      !ALLOWED_CV_MIME_TYPES.has(file.mimetype) ||
      !extension ||
      !ALLOWED_CV_EXTENSIONS.has(extension)
    ) {
      throw new BadRequestException('Chi cho phep upload file PDF/DOC/DOCX');
    }
  }

  validateCertificateFile(file?: CvUploadFile) {
    if (!file) {
      return;
    }

    if (file.size > MAX_CERTIFICATE_FILE_SIZE) {
      throw new BadRequestException('File certificate toi da 5MB');
    }

    const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];

    if (
      !ALLOWED_CERTIFICATE_MIME_TYPES.has(file.mimetype) ||
      !extension ||
      !ALLOWED_CERTIFICATE_EXTENSIONS.has(extension)
    ) {
      throw new BadRequestException(
        'Chi cho phep upload certificate PDF/PNG/JPG/JPEG',
      );
    }
  }

  private ensureCanViewCv(id: number, user: RequestUser) {
    if (!user) {
      throw new UnauthorizedException('Chua dang nhap');
    }

    if (user.role !== 'SEEKER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Khong co quyen xem CV');
    }

    if (user.role === 'SEEKER' && user.sub !== id) {
      throw new ForbiddenException('Khong co quyen xem CV cua nguoi khac');
    }
  }

  private async getOrCreateMyCv(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        role: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('User khong ton tai');
    }

    if (user.role !== 'SEEKER') {
      throw new ForbiddenException('Seeker only');
    }

    const seeker = await this.prisma.seeker.findUnique({
      where: { seeker_id: userId },
      select: {
        seeker_id: true,
      },
    });

    if (seeker) {
      return seeker.seeker_id;
    }

    const createdSeeker = await this.prisma.seeker.create({
      data: {
        seeker_id: userId,
        updated_date: new Date(),
      },
      select: {
        seeker_id: true,
      },
    });

    return createdSeeker.seeker_id;
  }

  validateDateRange(
    startDate?: string | Date | null,
    endDate?: string | Date | null,
  ) {
    if (!startDate) {
      return;
    }

    const parsedStartDate = this.toDate(startDate);
    const parsedEndDate = this.toOptionalDate(endDate);

    if (parsedEndDate && parsedStartDate >= parsedEndDate) {
      throw new BadRequestException('startDate phai nho hon endDate');
    }
  }

  private async ensureCvItemOwner(
    itemId: string,
    userId: number,
    modelName: CvOwnerModelName,
  ) {
    const seekerId = await this.getOrCreateMyCv(userId);
    const item = await this.findCvItemOwner(itemId, modelName);

    this.ensureOwner(item, seekerId, `${modelName} khong ton tai`);

    return item;
  }

  private findCvItemOwner(itemId: string, modelName: CvOwnerModelName) {
    const select = { id: true, userId: true };

    if (modelName === 'personality') {
      return this.prisma.cvPersonality.findUnique({
        where: { id: itemId },
        select,
      });
    }

    if (modelName === 'certificate') {
      return this.prisma.cvCertificate.findUnique({
        where: { id: itemId },
        select,
      });
    }

    return this.prisma.cvProject.findUnique({
      where: { id: itemId },
    });
  }

  private validateProjectLink(link?: string | null) {
    this.validateHttpUrl(link, 'link khong hop le');
  }

  private validateHttpUrl(value?: string | null, message = 'URL khong hop le') {
    if (!value) {
      return;
    }

    try {
      const url = new URL(value);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new BadRequestException(message);
    }
  }

  private normalizeSkillNames(skills: string[]) {
    const trimmedSkills = skills.map((skill) => skill.trim()).filter(Boolean);
    const uniqueKeys = new Set(
      trimmedSkills.map((skill) => skill.toLowerCase()),
    );

    if (
      trimmedSkills.length !== skills.length ||
      uniqueKeys.size !== trimmedSkills.length
    ) {
      throw new BadRequestException('Skills khong duoc trung nhau');
    }

    if (trimmedSkills.length > MAX_SKILLS_PER_CV) {
      throw new BadRequestException('Moi lan them toi da 20 skills');
    }

    return trimmedSkills;
  }

  private ensureOwner<T extends { userId: number } | null>(
    record: T,
    seekerId: number,
    notFoundMessage: string,
  ): asserts record is NonNullable<T> {
    if (!record) {
      throw new NotFoundException(notFoundMessage);
    }

    if (record.userId !== seekerId) {
      throw new ForbiddenException('Khong co quyen thao tac du lieu nay');
    }
  }

  private toDate(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Date khong hop le');
    }

    return date;
  }

  private toOptionalDate(value?: string | Date | null) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.toDate(value);
  }
}

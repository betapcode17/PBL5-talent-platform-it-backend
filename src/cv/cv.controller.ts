import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReqUser } from '../common/decorators/req-user.decorator.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import {
  certificateUploadOptions,
  cvUploadOptions,
} from '../upload/multer.options.js';
import { CreateCertificateDto } from './dto/create-certificate.dto.js';
import { CreateEducationDto } from './dto/create-education.dto.js';
import { CreateExperienceDto } from './dto/create-experience.dto.js';
import { CreatePersonalityDto } from './dto/create-personality.dto.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { CreateSkillsDto } from './dto/create-skills.dto.js';
import { CvResponseDto } from './dto/cv-response.dto.js';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
import { UpdateCertificateDto } from './dto/update-certificate.dto.js';
import { UpdateEducationDto } from './dto/update-education.dto.js';
import { UpdateCvFileDto } from './dto/update-cv-file.dto.js';
import { UpdateExperienceDto } from './dto/update-experience.dto.js';
import { UpdatePersonalityDto } from './dto/update-personality.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { UpdateSkillDto } from './dto/update-skill.dto.js';
import { CvService, CvUploadFile } from './cv.service.js';

type RequestUser = {
  sub: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
  email?: string;
};

@ApiTags('cv')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @ApiOperation({ summary: 'Upload file CV cua seeker dang dang nhap' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateCvFileDto })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        cvUrl: 'https://res.cloudinary.com/demo/raw/upload/cv.pdf',
      },
    },
  })
  @Put('file')
  @UseInterceptors(FileInterceptor('file', cvUploadOptions))
  uploadFile(
    @UploadedFile() file: CvUploadFile | undefined,
    @ReqUser() user: RequestUser,
  ) {
    return this.cvService.uploadCvFile(user, file);
  }

  @ApiOperation({ summary: 'Them education cho seeker dang dang nhap' })
  @ApiBody({ type: CreateEducationDto })
  @Post('education')
  createEducation(
    @ReqUser() user: RequestUser,
    @Body() dto: CreateEducationDto,
  ) {
    return this.cvService.createEducation(user, dto);
  }

  @ApiOperation({
    summary: 'Lay danh sach education cua seeker dang dang nhap',
  })
  @Get('education')
  listEducations(
    @ReqUser() user: RequestUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.cvService.listEducations(user, query);
  }

  @ApiOperation({ summary: 'Cap nhat education theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({ type: UpdateEducationDto })
  @Put('education/:id')
  updateEducation(
    @ReqUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateEducationDto,
  ) {
    return this.cvService.updateEducation(user, id, dto);
  }

  @ApiOperation({ summary: 'Xoa education theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @Delete('education/:id')
  deleteEducation(@ReqUser() user: RequestUser, @Param('id') id: string) {
    return this.cvService.deleteEducation(user, id);
  }

  @ApiOperation({ summary: 'Them experience cho seeker dang dang nhap' })
  @ApiBody({ type: CreateExperienceDto })
  @Post('experience')
  createExperience(
    @ReqUser() user: RequestUser,
    @Body() dto: CreateExperienceDto,
  ) {
    return this.cvService.createExperience(user, dto);
  }

  @ApiOperation({
    summary: 'Lay danh sach experience cua seeker dang dang nhap',
  })
  @Get('experience')
  listExperiences(
    @ReqUser() user: RequestUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.cvService.listExperiences(user, query);
  }

  @ApiOperation({ summary: 'Cap nhat experience theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({ type: UpdateExperienceDto })
  @Put('experience/:id')
  updateExperience(
    @ReqUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.cvService.updateExperience(user, id, dto);
  }

  @ApiOperation({ summary: 'Xoa experience theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @Delete('experience/:id')
  deleteExperience(@ReqUser() user: RequestUser, @Param('id') id: string) {
    return this.cvService.deleteExperience(user, id);
  }

  @ApiOperation({ summary: 'Them nhieu skills cho seeker dang dang nhap' })
  @ApiBody({ type: CreateSkillsDto })
  @Post('skills')
  createSkills(@ReqUser() user: RequestUser, @Body() dto: CreateSkillsDto) {
    return this.cvService.createSkills(user, dto);
  }

  @ApiOperation({ summary: 'Lay danh sach skills cua seeker dang dang nhap' })
  @Get('skills')
  listSkills(@ReqUser() user: RequestUser) {
    return this.cvService.listSkills(user);
  }

  @ApiOperation({ summary: 'Cap nhat skill theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({ type: UpdateSkillDto })
  @Put('skills/:id')
  updateSkill(
    @ReqUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
  ) {
    return this.cvService.updateSkill(user, id, dto);
  }

  @ApiOperation({ summary: 'Xoa skill theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @Delete('skills/:id')
  deleteSkill(@ReqUser() user: RequestUser, @Param('id') id: string) {
    return this.cvService.deleteSkill(user, id);
  }

  @ApiOperation({ summary: 'Them personality cho CV cua seeker' })
  @ApiBody({ type: CreatePersonalityDto })
  @Post('personality')
  createPersonality(
    @ReqUser() user: RequestUser,
    @Body() dto: CreatePersonalityDto,
  ) {
    return this.cvService.createPersonality(user, dto);
  }

  @ApiOperation({ summary: 'Lay danh sach personality cua seeker' })
  @Get('personality')
  listPersonalities(@ReqUser() user: RequestUser) {
    return this.cvService.listPersonalities(user);
  }

  @ApiOperation({ summary: 'Cap nhat personality theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({ type: UpdatePersonalityDto })
  @Put('personality/:id')
  updatePersonality(
    @ReqUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePersonalityDto,
  ) {
    return this.cvService.updatePersonality(user, id, dto);
  }

  @ApiOperation({ summary: 'Xoa personality theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @Delete('personality/:id')
  deletePersonality(@ReqUser() user: RequestUser, @Param('id') id: string) {
    return this.cvService.deletePersonality(user, id);
  }

  @ApiOperation({ summary: 'Them certificate cho CV cua seeker' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'issuer'],
      properties: {
        title: { type: 'string', example: 'AWS Cloud Practitioner' },
        issuer: { type: 'string', example: 'Amazon Web Services' },
        issuedDate: { type: 'string', example: '2025-01-01' },
        fileUrl: { type: 'string', example: 'https://example.com/cert.pdf' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @Post('certificates')
  @UseInterceptors(FileInterceptor('file', certificateUploadOptions))
  createCertificate(
    @ReqUser() user: RequestUser,
    @Body() dto: CreateCertificateDto,
    @UploadedFile() file: CvUploadFile | undefined,
  ) {
    return this.cvService.createCertificate(user, dto, file);
  }

  @ApiOperation({ summary: 'Lay danh sach certificates cua seeker' })
  @Get('certificates')
  listCertificates(@ReqUser() user: RequestUser) {
    return this.cvService.listCertificates(user);
  }

  @ApiOperation({ summary: 'Cap nhat certificate theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({ type: UpdateCertificateDto })
  @Put('certificates/:id')
  updateCertificate(
    @ReqUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCertificateDto,
  ) {
    return this.cvService.updateCertificate(user, id, dto);
  }

  @ApiOperation({ summary: 'Xoa certificate theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @Delete('certificates/:id')
  deleteCertificate(@ReqUser() user: RequestUser, @Param('id') id: string) {
    return this.cvService.deleteCertificate(user, id);
  }

  @ApiOperation({ summary: 'Them project cho CV cua seeker' })
  @ApiBody({ type: CreateProjectDto })
  @Post('projects')
  createProject(@ReqUser() user: RequestUser, @Body() dto: CreateProjectDto) {
    return this.cvService.createProject(user, dto);
  }

  @ApiOperation({ summary: 'Lay danh sach projects cua seeker' })
  @Get('projects')
  listProjects(@ReqUser() user: RequestUser) {
    return this.cvService.listProjects(user);
  }

  @ApiOperation({ summary: 'Cap nhat project theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({ type: UpdateProjectDto })
  @Put('projects/:id')
  updateProject(
    @ReqUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.cvService.updateProject(user, id, dto);
  }

  @ApiOperation({ summary: 'Xoa project theo id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @Delete('projects/:id')
  deleteProject(@ReqUser() user: RequestUser, @Param('id') id: string) {
    return this.cvService.deleteProject(user, id);
  }

  @ApiOperation({ summary: 'Lay CV day du cua seeker theo id' })
  @ApiParam({ name: 'id', example: 1, description: 'Seeker/User id' })
  @ApiResponse({ status: 200, type: CvResponseDto })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @ReqUser() user: RequestUser) {
    return this.cvService.findOne(id, user);
  }
}

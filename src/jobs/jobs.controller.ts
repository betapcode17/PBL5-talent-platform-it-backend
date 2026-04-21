import {
  Body,
  Patch,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReqUser } from '../common/decorators/req-user.decorator.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { GetCompanyJobsQueryDto } from './dto/get-company-jobs.query.dto.js';
import { SearchJobsQueryDto } from './dto/search-jobs.query.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { EmployeeGuard } from './guards/employee.guard.js';
import { JobsService } from './jobs.service.js';

type RequestUser = {
  sub: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
  email: string;
};

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({ summary: 'Tao job post (yeu cau token recruiter)' })
  @ApiBearerAuth()
  @ApiBody({
    type: CreateJobDto,
    examples: {
      example1: {
        summary: 'Create job sample',
        value: {
          title: 'Backend Developer',
          description: 'Phat trien API bang NestJS',
          categoryId: 1,
          jobTypeId: 1,
          companyId: 1,
          salaryRange: { min: 1000, max: 2000 },
          requirements: [
            '2+ nam kinh nghiem NestJS',
            'Biet Prisma va PostgreSQL',
          ],
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard, EmployeeGuard)
  @Post()
  create(@ReqUser() user: RequestUser, @Body() dto: CreateJobDto) {
    return this.jobsService.createJob(user.sub, dto);
  }

  @ApiOperation({ summary: 'Tim kiem jobs (Auth optional)' })
  @ApiQuery({ name: 'q', required: false, example: 'frontend' })
  @ApiQuery({ name: 'category', required: false, example: 'web' })
  @ApiQuery({ name: 'location', required: false, example: 'HN' })
  @ApiQuery({ name: 'salaryMin', required: false, example: '10M' })
  @ApiQuery({ name: 'salaryMax', required: false, example: '50M' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @Get('search')
  search(@Query() query: SearchJobsQueryDto) {
    return this.jobsService.searchJobs(query);
  }

  @ApiOperation({ summary: 'Lay toan bo jobs (Auth optional)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'active',
    required: false,
    example: true,
    description: 'Filter theo trang thai active',
  })
  @Get()
  findAll(@Query() query: GetCompanyJobsQueryDto) {
    return this.jobsService.getAllJobs(query.page, query.limit, query.active);
  }

  @ApiOperation({ summary: 'Lay jobs cua company (tam thoi khong auth)' })
  @ApiParam({ name: 'companyId', example: 1, description: 'ID cua company' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'active',
    required: false,
    example: true,
    description: 'Filter theo trang thai active',
  })
  @Get('company/:companyId')
  findByCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query() query: GetCompanyJobsQueryDto,
  ) {
    return this.jobsService.getCompanyJobs(
      companyId,
      query.page,
      query.limit,
      query.active,
    );
  }

  @ApiOperation({ summary: 'Lay chi tiet job post theo id' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua job post' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.getJobDetail(id);
  }

  @ApiOperation({ summary: 'Cap nhat job post theo id (yeu cau token recruiter)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua job post' })
  @ApiBearerAuth()
  @ApiBody({
    type: UpdateJobDto,
    examples: {
      example1: {
        summary: 'Update job sample',
        value: {
          title: 'Senior Backend Developer',
          description: 'Phat trien va toi uu API bang NestJS',
          categoryId: 1,
          jobTypeId: 1,
          salaryRange: { min: 1500, max: 2500 },
          companyId: 1,
          requirements: [
            '3+ nam kinh nghiem NestJS',
            'Co kinh nghiem thiet ke REST API',
          ],
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard, EmployeeGuard)
  @Put(':id')
  update(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.updateJob(id, user.sub, dto);
  }

  @ApiOperation({ summary: 'Xoa job post theo id (soft delete, yeu cau token recruiter)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua job post' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, EmployeeGuard)
  @Delete(':id')
  remove(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.jobsService.deleteJob(id, user.sub);
  }

  @ApiOperation({ summary: 'Kich hoat job post theo id (yeu cau token recruiter)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua job post' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, EmployeeGuard)
  @Patch(':id/activate')
  activate(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.jobsService.activateJob(id, user.sub);
  }

  @ApiOperation({ summary: 'Vo hieu hoa job post theo id (yeu cau token recruiter)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua job post' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, EmployeeGuard)
  @Patch(':id/deactivate')
  deactivate(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.jobsService.deactivateJob(id, user.sub);
  }
}

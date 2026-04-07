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
  Req,
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
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { GetCompanyJobsQueryDto } from './dto/get-company-jobs.query.dto.js';
import { SearchJobsQueryDto } from './dto/search-jobs.query.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { JobsService } from './jobs.service.js';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({ summary: 'Tao job post (no auth - temp)' })
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
          salaryRange: { min: 1000, max: 2000 },
          companyId: 1,
          requirements: [
            '2+ nam kinh nghiem NestJS',
            'Biet Prisma va PostgreSQL',
          ],
        },
      },
    },
  })
  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobsService.createJob(dto);
  }

  @ApiOperation({ summary: 'Tim kiem jobs (Auth optional)' })
  @ApiQuery({ name: 'q', required: false, example: 'frontend' })
  @ApiQuery({ name: 'category', required: false, example: 'web' })
  @ApiQuery({ name: 'location', required: false, example: 'HN' })
  @ApiQuery({ name: 'salaryMin', required: false, example: '10M' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @Get('search')
  search(@Query() query: SearchJobsQueryDto) {
    return this.jobsService.searchJobs(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lay jobs cua company (Auth company)' })
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
    @Req() req: { user: { sub: number; role: string } },
  ) {
    return this.jobsService.getCompanyJobs(
      companyId,
      query.page,
      query.limit,
      query.active,
      req.user,
    );
  }

  @ApiOperation({ summary: 'Lay chi tiet job post theo id' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua job post' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.getJobDetail(id);
  }

  @ApiOperation({ summary: 'Cap nhat job post theo id (no auth - temp)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua job post' })
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
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJobDto) {
    return this.jobsService.updateJob(id, dto);
  }

  @ApiOperation({ summary: 'Xoa job post theo id (soft delete, no auth - temp)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua job post' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.deleteJob(id);
  }

  @ApiOperation({ summary: 'Kich hoat job post theo id (no auth - temp)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua job post' })
  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.activateJob(id);
  }

  @ApiOperation({ summary: 'Vo hieu hoa job post theo id (no auth - temp)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua job post' })
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.deactivateJob(id);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReqUser } from '../common/decorators/req-user.decorator.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { EmployeeGuard } from '../jobs/guards/employee.guard.js';
import { SeekerGuard } from '../bookmarks/guards/seeker.guard.js';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { GetJobApplicationsQueryDto } from './dto/get-job-applications.query.dto.js';
import { GetMyApplicationsQueryDto } from './dto/get-my-applications.query.dto.js';
import { RejectApplicationDto } from './dto/reject-application.dto.js';
import { ApplicationQueryStatus } from './enums/application.enum.js';

type RequestUser = {
  sub: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
  email: string;
};

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @ApiOperation({ summary: 'Seeker nop don ung tuyen vao mot job' })
  @ApiBody({ type: CreateApplicationDto })
  @ApiResponse({ status: 201, description: 'Ung tuyen thanh cong' })
  @UseGuards(SeekerGuard)
  @Post()
  create(@ReqUser() user: RequestUser, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Lay danh sach applications cua seeker hien tai' })
  @ApiQuery({ name: 'status', required: false, enum: ApplicationQueryStatus })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Danh sach applications cua seeker',
  })
  @UseGuards(SeekerGuard)
  @Get('me')
  findMine(
    @ReqUser() user: RequestUser,
    @Query() query: GetMyApplicationsQueryDto,
  ) {
    return this.applicationsService.findMine(user.sub, query);
  }

  @ApiOperation({ summary: 'Lay danh sach applications cua mot job' })
  @ApiParam({ name: 'jobPostId', example: 1 })
  @ApiQuery({ name: 'status', required: false, enum: ApplicationQueryStatus })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Danh sach applications theo job' })
  @UseGuards(EmployeeGuard)
  @Get('job/:jobPostId')
  findByJob(
    @ReqUser() user: RequestUser,
    @Param('jobPostId', ParseIntPipe) jobPostId: number,
    @Query() query: GetJobApplicationsQueryDto,
  ) {
    return this.applicationsService.findByJob(jobPostId, user.sub, query);
  }

  @ApiOperation({ summary: 'Chap nhan application' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Application duoc chap nhan',
  })
  @UseGuards(EmployeeGuard)
  @Patch(':id/accept')
  accept(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) applicationId: number,
  ) {
    return this.applicationsService.accept(applicationId, user.sub);
  }

  @ApiOperation({ summary: 'Tu choi application' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: RejectApplicationDto })
  @ApiResponse({
    status: 200,
    description: 'Application bi tu choi',
  })
  @UseGuards(EmployeeGuard)
  @Patch(':id/reject')
  reject(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) applicationId: number,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.applicationsService.reject(applicationId, user.sub, dto);
  }
}

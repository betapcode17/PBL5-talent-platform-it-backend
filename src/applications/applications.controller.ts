import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReqUser } from '../common/decorators/req-user.decorator.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { EmployeeGuard } from '../jobs/guards/employee.guard.js';
import { SeekerGuard } from '../bookmarks/guards/seeker.guard.js';
import { cvUploadOptions } from '../upload/multer.options.js';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { GetJobApplicationsQueryDto } from './dto/get-job-applications.query.dto.js';
import { GetMyApplicationsQueryDto } from './dto/get-my-applications.query.dto.js';
import { RejectApplicationDto } from './dto/reject-application.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';
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

  @ApiOperation({ summary: 'Seeker tai len CV rieng cho lan ung tuyen' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Tai CV len thanh cong' })
  @UseGuards(SeekerGuard)
  @UseInterceptors(FileInterceptor('file', cvUploadOptions))
  @Post('upload-cv')
  uploadCv(
    @ReqUser() user: RequestUser,
    @UploadedFile()
    file: {
      buffer: Buffer;
      size: number;
      mimetype: string;
      originalname: string;
    },
  ) {
    return this.applicationsService.uploadApplicationCv(user.sub, file);
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

  @ApiOperation({ summary: 'Cap nhat status cua application' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateApplicationStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Application status duoc cap nhat',
  })
  @ApiResponse({ status: 403, description: 'Khong co quyen cap nhat' })
  @ApiResponse({ status: 404, description: 'Application khong ton tai' })
  @UseGuards(EmployeeGuard)
  @Patch(':id/status')
  updateStatus(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) applicationId: number,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(
      applicationId,
      user.sub,
      dto,
    );
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

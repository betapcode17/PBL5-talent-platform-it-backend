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
import { CancelInterviewDto } from './dto/cancel-interview.dto.js';
import { CompleteInterviewDto } from './dto/complete-interview.dto.js';
import { CreateInterviewDto } from './dto/create-interview.dto.js';
import { GetMyInterviewsQueryDto } from './dto/get-my-interviews.query.dto.js';
import { RescheduleInterviewDto } from './dto/reschedule-interview.dto.js';
import { InterviewsService } from './interviews.service.js';
import {
  MyInterviewRole,
  MyInterviewStatus,
} from './enums/interview.enum.js';

type RequestUser = {
  sub: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
  email: string;
};

@ApiTags('interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @ApiOperation({ summary: 'Tao interview moi' })
  @ApiBody({ type: CreateInterviewDto })
  @ApiResponse({ status: 201, description: 'Interview duoc tao thanh cong' })
  @Post()
  create(@ReqUser() user: RequestUser, @Body() dto: CreateInterviewDto) {
    return this.interviewsService.create(user.sub, user.role, dto);
  }

  @ApiOperation({ summary: 'Lay interviews cua user hien tai' })
  @ApiQuery({ name: 'role', required: false, enum: MyInterviewRole })
  @ApiQuery({ name: 'status', required: false, enum: MyInterviewStatus })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Danh sach interviews' })
  @Get('me')
  findMine(
    @ReqUser() user: RequestUser,
    @Query() query: GetMyInterviewsQueryDto,
  ) {
    return this.interviewsService.findMine(user.sub, user.role, query);
  }

  @ApiOperation({ summary: 'Lay interviews theo application id' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Danh sach interviews theo application' })
  @Get('application/:id')
  findByApplication(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) applicationId: number,
  ) {
    return this.interviewsService.findByApplication(
      applicationId,
      user.sub,
      user.role,
    );
  }

  @ApiOperation({ summary: 'Doi lich interview' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: RescheduleInterviewDto })
  @Patch(':id/reschedule')
  reschedule(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) interviewId: number,
    @Body() dto: RescheduleInterviewDto,
  ) {
    return this.interviewsService.reschedule(
      interviewId,
      user.sub,
      user.role,
      dto,
    );
  }

  @ApiOperation({ summary: 'Huy interview' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: CancelInterviewDto })
  @Patch(':id/cancel')
  cancel(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) interviewId: number,
    @Body() dto: CancelInterviewDto,
  ) {
    return this.interviewsService.cancel(interviewId, user.sub, user.role, dto);
  }

  @ApiOperation({ summary: 'Hoan thanh interview' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: CompleteInterviewDto })
  @Patch(':id/complete')
  complete(
    @ReqUser() user: RequestUser,
    @Param('id', ParseIntPipe) interviewId: number,
    @Body() dto: CompleteInterviewDto,
  ) {
    return this.interviewsService.complete(
      interviewId,
      user.sub,
      user.role,
      dto,
    );
  }
}

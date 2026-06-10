import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { EmployeeGuard } from '../jobs/guards/employee.guard.js';
import { AiScreeningQueueService } from './ai-screening-queue.service.js';
import { RunAiScreeningDto } from './dto/run-ai-screening.dto.js';

type AuthenticatedRequest = {
  user?: {
    sub?: number;
    id?: number;
    user_id?: number;
  };
};

@ApiTags('ai-screening')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EmployeeGuard)
@Controller('employees/me/jobs')
export class AiScreeningController {
  constructor(private readonly queue: AiScreeningQueueService) {}

  @ApiOperation({ summary: 'Chay AI screening cho applications cua mot job' })
  @ApiParam({ name: 'jobId', example: 1 })
  @ApiBody({ type: RunAiScreeningDto })
  @ApiResponse({ status: 200, description: 'Ket qua AI screening theo job' })
  @ApiResponse({ status: 403, description: 'Khong co quyen chay screening' })
  @ApiResponse({ status: 404, description: 'Job khong ton tai' })
  @Post(':jobId/ai-screening')
  runAiScreeningForJob(
    @Req() req: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() dto: RunAiScreeningDto,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.user_id;

    if (typeof userId !== 'number') {
      throw new ForbiddenException('Khong xac dinh duoc user tu token');
    }

    return this.queue.enqueue(userId, jobId, dto);
  }

  @ApiOperation({ summary: 'Lay AI screening run dang hoat dong cua mot job' })
  @ApiParam({ name: 'jobId', example: 1 })
  @Get(':jobId/ai-screening/active')
  getActiveAiScreeningForJob(
    @Req() req: AuthenticatedRequest,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.user_id;

    if (typeof userId !== 'number') {
      throw new ForbiddenException('Khong xac dinh duoc user tu token');
    }

    return this.queue.getActiveRunForJob(userId, jobId);
  }
}

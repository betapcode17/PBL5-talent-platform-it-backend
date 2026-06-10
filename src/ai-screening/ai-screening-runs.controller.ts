import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { EmployeeGuard } from '../jobs/guards/employee.guard.js';
import { AiScreeningQueueService } from './ai-screening-queue.service.js';

type AuthenticatedRequest = {
  user?: { sub?: number; id?: number; user_id?: number };
};

@ApiTags('ai-screening')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EmployeeGuard)
@Controller('employees/me/ai-screening-runs')
export class AiScreeningRunsController {
  constructor(private readonly queue: AiScreeningQueueService) {}

  @ApiOperation({ summary: 'Lay AI screening run dang hoat dong cua cong ty' })
  @Get('active')
  getActiveRun(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.user_id;
    if (typeof userId !== 'number') {
      throw new ForbiddenException('Khong xac dinh duoc user tu token');
    }
    return this.queue.getActiveRun(userId);
  }

  @ApiOperation({ summary: 'Lay trang thai AI screening background run' })
  @Get(':runId')
  getRunStatus(
    @Req() req: AuthenticatedRequest,
    @Param('runId', ParseIntPipe) runId: number,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.user_id;
    if (typeof userId !== 'number') {
      throw new ForbiddenException('Khong xac dinh duoc user tu token');
    }
    return this.queue.getRunStatus(userId, runId);
  }
}

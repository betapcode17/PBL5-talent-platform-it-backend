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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { CreateJobTypeDto } from './dto/create-job-type.dto.js';
import { ListJobTypesQueryDto } from './dto/list-job-types.query.dto.js';
import { UpdateJobTypeDto } from './dto/update-job-type.dto.js';
import { AdminGuard } from './guards/admin.guard.js';
import { JobTypesService } from './job-types.service.js';
import { JoiValidationPipe } from './validation/joi-validation.pipe.js';
import {
  createJobTypeSchema,
  updateJobTypeSchema,
} from './validation/schemas.js';

@ApiTags('job-types')
@Controller('job-types')
export class JobTypesController {
  constructor(private readonly jobTypesService: JobTypesService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tao job type (ADMIN)' })
  @ApiBody({ type: CreateJobTypeDto })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(
    @Body(new JoiValidationPipe(createJobTypeSchema)) dto: CreateJobTypeDto,
  ) {
    return this.jobTypesService.createJobType(dto);
  }

  @ApiOperation({ summary: 'Lay danh sach job types' })
  @ApiQuery({ name: 'active', required: false, example: true })
  @Get()
  findAll(@Query() query: ListJobTypesQueryDto) {
    return this.jobTypesService.getJobTypes(query.active);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cap nhat job type (ADMIN)' })
  @ApiBody({ type: UpdateJobTypeDto })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(updateJobTypeSchema)) dto: UpdateJobTypeDto,
  ) {
    return this.jobTypesService.updateJobType(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xoa mem job type (ADMIN)' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.jobTypesService.deleteJobType(id);
  }
}

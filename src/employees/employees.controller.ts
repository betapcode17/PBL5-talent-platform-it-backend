import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { AdminGuard } from '../job-types/guards/admin.guard.js';
import { ReqUser } from '../common/decorators/req-user.decorator.js';

interface IUserPayload {
  sub: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
}

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  private assertEmployee(user: IUserPayload) {
    if (user.role !== 'EMPLOYEE') {
      throw new ForbiddenException('Chi employee moi co the truy cap');
    }
  }

  @ApiOperation({ summary: 'Tạo employee và gửi account qua email' })
  @ApiBody({
    type: CreateEmployeeDto,
    examples: {
      example: {
        value: {
          full_name: 'Nguyen Van A',
          role: 'HR',
          email: 'hr.company@example.com',
          phone: '0901234567',
          company_name: 'ABC Tech',
          company_address: 'Da Nang',
          company_website_url: 'https://abctech.vn',
          company_id: 1,
          joined_date: '2026-03-28T00:00:00.000Z',
        },
      },
    },
  })
  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  getMyProfile(@ReqUser() user: IUserPayload) {
    this.assertEmployee(user);
    return this.employeesService.getMyProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/dashboard')
  getEmployerDashboard(@ReqUser() user: IUserPayload) {
    this.assertEmployee(user);
    return this.employeesService.getEmployerDashboard(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/jobs')
  getEmployerJobs(
    @ReqUser() user: IUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertEmployee(user);
    return this.employeesService.getEmployerJobs(
      user.sub,
      Number(page || 1),
      Number(limit || 10),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/candidates')
  getEmployerCandidates(
    @ReqUser() user: IUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertEmployee(user);
    return this.employeesService.getEmployerCandidates(
      user.sub,
      Number(page || 1),
      Number(limit || 10),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/interviews')
  getEmployerInterviews(
    @ReqUser() user: IUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertEmployee(user);
    return this.employeesService.getEmployerInterviews(
      user.sub,
      Number(page || 1),
      Number(limit || 10),
    );
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @ReqUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (user.role !== 'ADMIN' && user.sub !== id) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin employee này');
    }
    return this.employeesService.findOne(id);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin employee' })
  @ApiBody({
    type: UpdateEmployeeDto,
    examples: {
      example: {
        value: {
          role: 'Lead Recruiter',
          phone: '0911222333',
          company_name: 'ABC Tech Vietnam',
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @ReqUser() user: IUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    if (user.role !== 'ADMIN' && user.sub !== id) {
      throw new ForbiddenException('Bạn không có quyền sửa thông tin employee này');
    }
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.remove(id);
  }
}

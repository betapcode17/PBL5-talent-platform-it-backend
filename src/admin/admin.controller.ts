import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { AdminGuard } from '../job-types/guards/admin.guard.js';
import { AdminService } from './admin.service.js';
import { GetAdminCompaniesQueryDto } from './dto/get-admin-companies.query.dto.js';
import { GetAdminStatisticsQueryDto } from './dto/get-admin-statistics.query.dto.js';
import { GetAdminUsersQueryDto } from './dto/get-admin-users.query.dto.js';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Lay thong ke tong quan he thong (ADMIN)' })
  @ApiQuery({ name: 'dailyDays', required: false, example: 30 })
  @ApiQuery({ name: 'weeklyWeeks', required: false, example: 12 })
  @ApiQuery({ name: 'monthlyMonths', required: false, example: 12 })
  @Get('statistics')
  getStatistics(@Query() query: GetAdminStatisticsQueryDto) {
    return this.adminService.getStatistics(query);
  }

  @ApiOperation({ summary: 'Lay danh sach users cho admin (ADMIN)' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['ADMIN', 'SEEKER', 'EMPLOYEE'],
  })
  @ApiQuery({ name: 'search', required: false, example: 'nguyen@example.com' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('users')
  getUsers(@Query() query: GetAdminUsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  @ApiOperation({ summary: 'Lay danh sach companies cho admin (ADMIN)' })
  @ApiQuery({ name: 'industry', required: false, example: 'Software' })
  @ApiQuery({ name: 'active', required: false, example: true })
  @ApiQuery({ name: 'search', required: false, example: 'Tech' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('companies')
  getCompanies(@Query() query: GetAdminCompaniesQueryDto) {
    return this.adminService.getCompanies(query);
  }
}

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
import { GetAdminJobsQueryDto } from './dto/get-admin-jobs.query.dto.js';

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

  @ApiOperation({ summary: 'Lay danh sach users dang active (ADMIN)' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['ADMIN', 'SEEKER', 'EMPLOYEE'],
  })
  @ApiQuery({ name: 'search', required: false, example: 'nguyen@example.com' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('users/active')
  activeUsers(@Query() query: GetAdminUsersQueryDto) {
    return this.adminService.activeUsers(query);
  }

  @ApiOperation({ summary: 'Lay danh sach users da bi ban (ADMIN)' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['ADMIN', 'SEEKER', 'EMPLOYEE'],
  })
  @ApiQuery({ name: 'search', required: false, example: 'nguyen@example.com' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('users/ban')
  banUsers(@Query() query: GetAdminUsersQueryDto) {
    return this.adminService.banUsers(query);
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

  @ApiOperation({ summary: 'Lay danh sach companies dang active (ADMIN)' })
  @ApiQuery({ name: 'industry', required: false, example: 'Software' })
  @ApiQuery({ name: 'search', required: false, example: 'Tech' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('companies/active')
  activeCompanies(@Query() query: GetAdminCompaniesQueryDto) {
    return this.adminService.activeCompanies(query);
  }

  @ApiOperation({ summary: 'Lay danh sach companies da bi ban (ADMIN)' })
  @ApiQuery({ name: 'industry', required: false, example: 'Software' })
  @ApiQuery({ name: 'search', required: false, example: 'Tech' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('companies/ban')
  banCompanies(@Query() query: GetAdminCompaniesQueryDto) {
    return this.adminService.banCompanies(query);
  }

  @ApiOperation({ summary: 'Lấy danh sách jobs cho admin (ADMIN)' })
  @ApiQuery({ name: 'search', required: false, example: 'Developer' })
  @ApiQuery({ name: 'industry', required: false, example: 'Software' })
  @ApiQuery({ name: 'level', required: false, example: 'Senior' })
  @ApiQuery({ name: 'categoryId', required: false, example: 1 })
  @ApiQuery({ name: 'jobTypeId', required: false, example: 1 })
  @ApiQuery({ name: 'minSalary', required: false, example: '20000000' })
  @ApiQuery({ name: 'maxSalary', required: false, example: '100000000' })
  @ApiQuery({ name: 'deadlineFrom', required: false, example: '2024-05-01' })
  @ApiQuery({ name: 'deadlineTo', required: false, example: '2024-12-31' })
  @ApiQuery({ name: 'active', required: false, example: true })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    example: 'createdDate',
    enum: ['createdDate', 'deadline', 'salary', 'numberOfHires', 'updatedDate'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('jobs')
  getJobs(@Query() query: GetAdminJobsQueryDto) {
    return this.adminService.getJobs(query);
  }

  @ApiOperation({ summary: 'Lay danh sach jobs dang active (ADMIN)' })
  @ApiQuery({ name: 'search', required: false, example: 'Developer' })
  @ApiQuery({ name: 'industry', required: false, example: 'Software' })
  @ApiQuery({ name: 'level', required: false, example: 'Senior' })
  @ApiQuery({ name: 'categoryId', required: false, example: 1 })
  @ApiQuery({ name: 'jobTypeId', required: false, example: 1 })
  @ApiQuery({ name: 'minSalary', required: false, example: '20000000' })
  @ApiQuery({ name: 'maxSalary', required: false, example: '100000000' })
  @ApiQuery({ name: 'deadlineFrom', required: false, example: '2024-05-01' })
  @ApiQuery({ name: 'deadlineTo', required: false, example: '2024-12-31' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    example: 'createdDate',
    enum: ['createdDate', 'deadline', 'salary', 'numberOfHires', 'updatedDate'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('jobs/active')
  activeJobs(@Query() query: GetAdminJobsQueryDto) {
    return this.adminService.activeJobs(query);
  }

  @ApiOperation({ summary: 'Lay danh sach jobs da bi ban (ADMIN)' })
  @ApiQuery({ name: 'search', required: false, example: 'Developer' })
  @ApiQuery({ name: 'industry', required: false, example: 'Software' })
  @ApiQuery({ name: 'level', required: false, example: 'Senior' })
  @ApiQuery({ name: 'categoryId', required: false, example: 1 })
  @ApiQuery({ name: 'jobTypeId', required: false, example: 1 })
  @ApiQuery({ name: 'minSalary', required: false, example: '20000000' })
  @ApiQuery({ name: 'maxSalary', required: false, example: '100000000' })
  @ApiQuery({ name: 'deadlineFrom', required: false, example: '2024-05-01' })
  @ApiQuery({ name: 'deadlineTo', required: false, example: '2024-12-31' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    example: 'createdDate',
    enum: ['createdDate', 'deadline', 'salary', 'numberOfHires', 'updatedDate'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('jobs/ban')
  banJobs(@Query() query: GetAdminJobsQueryDto) {
    return this.adminService.banJobs(query);
  }
}

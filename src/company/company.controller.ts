import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Req,
  Query,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { CompanyService } from './company.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @ApiOperation({ summary: 'Tạo company mới' })
  @ApiBody({ type: CreateCompanyDto })
  // @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @Req()
    req: Request & { user?: { id: number; email: string; role: string } },
    @Body() dto: CreateCompanyDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    // allow only admin or owner creation
    const user = req.user as { id: number; email: string; role: string };

    // if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
    //   throw new ForbiddenException('Không có quyền tạo company');
    // }
    return this.companyService.create(dto, user, logo);
  }

  @ApiOperation({ summary: 'Lấy danh sách companies (filter, pagination)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({
    name: 'industry',
    required: false,
    description: 'Filter by industry',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search keyword' })
  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('industry') industry?: string,
    @Query('q') q?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    return this.companyService.findAll({ page: pageNum, industry, q });
  }

  @ApiOperation({ summary: 'Lấy chi tiết company' })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req()
    req: Request & { user?: { id: number; email: string; role: string } },
  ) {
    const company = await this.companyService.findOne(
      Number(id),
      req.user as any,
    );
    if (!company) throw new NotFoundException('Company không tồn tại');
    return company;
  }

  @ApiOperation({ summary: 'Cập nhật company' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req()
    req: Request & { user?: { id: number; email: string; role: string } },
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(Number(id), dto, req.user as any);
  }

  @ApiOperation({ summary: 'Kích hoạt company' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/activate')
  async activate(
    @Param('id') id: string,
    @Req()
    req: Request & { user?: { id: number; email: string; role: string } },
  ) {
    const user = req.user as { role: string } | undefined;
    if (!user || user.role !== 'ADMIN')
      throw new ForbiddenException('Chỉ admin');
    return this.companyService.activate(Number(id));
  }

  @ApiOperation({ summary: 'Vô hiệu hóa company' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @Req()
    req: Request & { user?: { id: number; email: string; role: string } },
  ) {
    const user = req.user as { role: string } | undefined;
    if (!user || user.role !== 'ADMIN')
      throw new ForbiddenException('Chỉ admin');
    return this.companyService.deactivate(Number(id));
  }

  @ApiOperation({ summary: 'Xóa company (admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req()
    req: Request & { user?: { id: number; email: string; role: string } },
  ) {
    const user = req.user as { role: string } | undefined;
    if (!user || user.role !== 'ADMIN')
      throw new ForbiddenException('Chỉ admin');
    return this.companyService.remove(Number(id));
  }
}

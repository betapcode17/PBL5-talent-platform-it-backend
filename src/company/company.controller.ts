import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { imageUploadOptions } from '../upload/multer.options.js';
import { CompanyService } from './company.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

type CompanyRequestUser = {
  sub?: number;
  id?: number;
  email?: string;
  role?: string;
};

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @ApiOperation({ summary: 'Tạo company mới' })
  @ApiBody({ type: CreateCompanyDto })
  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @Req()
    req: Request & { user?: CompanyRequestUser },
    @Body() dto: CreateCompanyDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    const user = req.user as { id: number; email: string; role: string };
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
    req: Request & { user?: CompanyRequestUser },
  ) {
    const company = await this.companyService.findOne(
      Number(id),
      req.user ?? null,
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
    req: Request & { user?: CompanyRequestUser },
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(Number(id), dto, req.user ?? null);
  }

  @ApiOperation({ summary: 'Tải logo công ty' })
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @Put(':id/logo')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req()
    req: Request & { user?: CompanyRequestUser },
  ) {
    return this.companyService.uploadCompanyImage(
      Number(id),
      'company_image',
      file,
      req.user ?? null,
    );
  }

  @ApiOperation({ summary: 'Tải ảnh bìa công ty' })
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @Put(':id/cover')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req()
    req: Request & { user?: CompanyRequestUser },
  ) {
    return this.companyService.uploadCompanyImage(
      Number(id),
      'cover_image',
      file,
      req.user ?? null,
    );
  }

  @ApiOperation({ summary: 'Kích hoạt company' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/activate')
  async activate(
    @Param('id') id: string,
    @Req()
    req: Request & { user?: CompanyRequestUser },
  ) {
    const user = req.user as { role?: string } | undefined;
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
    req: Request & { user?: CompanyRequestUser },
  ) {
    const user = req.user as { role?: string } | undefined;
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
    req: Request & { user?: CompanyRequestUser },
  ) {
    const user = req.user as { role?: string } | undefined;
    if (!user || user.role !== 'ADMIN')
      throw new ForbiddenException('Chỉ admin');
    return this.companyService.remove(Number(id));
  }
}

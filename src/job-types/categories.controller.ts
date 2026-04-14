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
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { ListCategoriesQueryDto } from './dto/list-categories.query.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { AdminGuard } from './guards/admin.guard.js';
import { JobTypesService } from './job-types.service.js';
import { JoiValidationPipe } from './validation/joi-validation.pipe.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from './validation/schemas.js';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly jobTypesService: JobTypesService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tao category (ADMIN)' })
  @ApiBody({ type: CreateCategoryDto })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(
    @Body(new JoiValidationPipe(createCategorySchema)) dto: CreateCategoryDto,
  ) {
    return this.jobTypesService.createCategory(dto);
  }

  @ApiOperation({ summary: 'Lay category tree' })
  @ApiQuery({ name: 'parentId', required: false, example: 1 })
  @Get()
  findAll(@Query() query: ListCategoriesQueryDto) {
    return this.jobTypesService.getCategories(query.parentId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cap nhat category (ADMIN)' })
  @ApiBody({ type: UpdateCategoryDto })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(updateCategorySchema)) dto: UpdateCategoryDto,
  ) {
    return this.jobTypesService.updateCategory(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xoa mem category (ADMIN)' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.jobTypesService.deleteCategory(id);
  }
}

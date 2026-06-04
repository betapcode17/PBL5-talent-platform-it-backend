import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
  ApiTags,
} from '@nestjs/swagger';
import { ReqUser } from '../common/decorators/req-user.decorator.js';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { EmployeeGuard } from '../jobs/guards/employee.guard.js';
import { CreateLikeDto } from './dto/create-like.dto.js';
import { ListCompanyLikesQueryDto } from './dto/list-company-likes.query.dto.js';
import { LikesService } from './likes.service.js';

type RequestUser = {
  sub: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
};

@ApiTags('likes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @ApiOperation({ summary: 'Company like seeker' })
  @ApiBody({ type: CreateLikeDto })
  @UseGuards(EmployeeGuard)
  @Post()
  create(@ReqUser() user: RequestUser, @Body() dto: CreateLikeDto) {
    return this.likesService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Lay danh sach seeker da like cong ty' })
  @ApiParam({ name: 'companyId', example: 1 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @UseGuards(EmployeeGuard)
  @Get('company/:companyId')
  findByCompany(
    @ReqUser() user: RequestUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query() query: ListCompanyLikesQueryDto,
  ) {
    return this.likesService.findByCompany(user.sub, companyId, query);
  }

  @ApiOperation({ summary: 'Unlike seeker' })
  @ApiParam({ name: 'id', example: 1 })
  @UseGuards(EmployeeGuard)
  @Delete(':id')
  remove(@ReqUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.likesService.remove(user.sub, id);
  }
}

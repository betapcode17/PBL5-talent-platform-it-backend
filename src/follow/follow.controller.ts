import {
  Controller,
  Post,
  Delete,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard.js';
import { FollowService } from './follow.service.js';
import { ReqUser } from '../common/decorators/req-user.decorator.js';
import { Param } from '@nestjs/common';

interface IUserPayload {
  user_id: number;
  role: 'SEEKER' | 'EMPLOYEE' | 'ADMIN';
  seeker_id?: number;
}

@ApiTags('follow')
@ApiBearerAuth()
@Controller('follows')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async follow(
    @ReqUser() user: IUserPayload,
    @Query('company_id') company_id: number,
  ) {
    if (user.role !== 'SEEKER') {
      throw new BadRequestException('Chỉ seeker mới được follow');
    }

    if (!user.seeker_id) {
      throw new BadRequestException('Seeker ID không tồn tại');
    }

    if (!company_id) {
      throw new BadRequestException('Thiếu company_id');
    }

    return this.followService.followCompany(+company_id, user.seeker_id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async unfollow(
    @ReqUser() user: IUserPayload,
    @Query('company_id') company_id: number,
  ) {
    if (user.role !== 'SEEKER') {
      throw new BadRequestException('Chỉ seeker mới được unfollow');
    }

    if (!user.seeker_id) {
      throw new BadRequestException('Seeker ID không tồn tại');
    }

    if (!company_id) {
      throw new BadRequestException('Thiếu company_id');
    }

    return this.followService.unfollowCompany(+company_id, user.seeker_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyFollow(@ReqUser() user: IUserPayload) {
    if (user.role !== 'SEEKER') {
      return [];
    }

    if (!user.seeker_id) {
      throw new BadRequestException('Seeker ID không tồn tại');
    }

    return this.followService.getFollowedCompanies(user.seeker_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check')
  async checkFollow(
    @ReqUser() user: IUserPayload,
    @Query('company_id') company_id: number,
  ) {
    if (user.role !== 'SEEKER') {
      return false;
    }

    if (!user.seeker_id) {
      throw new BadRequestException('Seeker ID không tồn tại');
    }

    if (!company_id) {
      throw new BadRequestException('Thiếu company_id');
    }

    return this.followService.isFollowing(+company_id, user.seeker_id);
  }

  @Get('count')
  async getFollowCount(@Query('company_id') company_id: number) {
    if (!company_id) {
      throw new BadRequestException('Thiếu company_id');
    }

    return this.followService.getFollowCount(+company_id);
  }
}

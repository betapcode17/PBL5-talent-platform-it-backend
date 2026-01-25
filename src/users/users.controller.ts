import {
  Controller,
  Get,
  Body,
  UseGuards,
  Put,
  Patch,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ReqUser } from '../common/decorators/req-user.decorator.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageUploadOptions } from '../upload/multer.options.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@ReqUser() user) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.usersService.getMe(user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cập nhật profile user' })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      example1: {
        value: {
          email: '',
          full_name: 'Sigma',
          gender: '',
          phone: '',
        },
      },
    },
  })
  @Put('me')
  updateMe(@ReqUser() user, @Body() dto: UpdateUserDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.usersService.update(user.sub, dto);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/active')
  active(@Query('id') id: number) {
    return this.usersService.activateUser(+id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/deactivate')
  deactivate(@Query('id') id: number) {
    return this.usersService.deactivateUser(+id);
  }
  @Get()
  list(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('role') role?: string,
  ) {
    return this.usersService.getUsers(+page, +limit, role);
  }
  @ApiOperation({ summary: 'Upload avatar user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Put('me/avatar')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @ReqUser() user: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.usersService.uploadAvatar(user.sub, file);
  }
}

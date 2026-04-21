import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  MyInterviewRole,
  MyInterviewStatus,
} from '../enums/interview.enum.js';

export class GetMyInterviewsQueryDto {
  @ApiPropertyOptional({
    enum: MyInterviewRole,
    example: MyInterviewRole.ALL,
  })
  @IsOptional()
  @IsEnum(MyInterviewRole)
  role: MyInterviewRole = MyInterviewRole.ALL;

  @ApiPropertyOptional({
    enum: MyInterviewStatus,
    example: MyInterviewStatus.ALL,
  })
  @IsOptional()
  @IsEnum(MyInterviewStatus)
  status: MyInterviewStatus = MyInterviewStatus.ALL;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Type(() => Number)
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}

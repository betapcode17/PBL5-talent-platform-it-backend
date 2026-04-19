import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApplicationQueryStatus } from '../enums/application.enum.js';

export class GetJobApplicationsQueryDto {
  @ApiPropertyOptional({
    enum: ApplicationQueryStatus,
    example: ApplicationQueryStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ApplicationQueryStatus)
  status?: ApplicationQueryStatus;

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

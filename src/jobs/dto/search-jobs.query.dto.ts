import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchJobsQueryDto {
  @ApiPropertyOptional({ example: 'frontend', description: 'Tu khoa tim kiem' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ example: 'web', description: 'Loc theo category name' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'HN', description: 'Loc theo dia diem' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    example: '10M',
    description: 'Luong toi thieu (ho tro: 10000, 10k, 10m, 1b)',
  })
  @IsString()
  @IsOptional()
  salaryMin?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Type(() => Number)
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;
}
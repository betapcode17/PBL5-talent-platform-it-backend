import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateJobTypeDto {
  @ApiPropertyOptional({ example: 'Part-time' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Cong viec ban thoi gian' })
  @IsOptional()
  @IsString()
  description?: string;
}

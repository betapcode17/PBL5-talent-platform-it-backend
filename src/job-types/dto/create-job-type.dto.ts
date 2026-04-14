import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateJobTypeDto {
  @ApiProperty({ example: 'Full-time' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Cong viec toan thoi gian' })
  @IsOptional()
  @IsString()
  description?: string;
}

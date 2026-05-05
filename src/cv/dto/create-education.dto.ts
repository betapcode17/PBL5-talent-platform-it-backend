import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEducationDto {
  @ApiProperty({ example: 'Duy Tan University' })
  @IsString()
  @IsNotEmpty()
  school!: string;

  @ApiProperty({ example: 'Bachelor' })
  @IsString()
  @IsNotEmpty()
  degree!: string;

  @ApiPropertyOptional({ example: 'Software Engineering' })
  @IsOptional()
  @IsString()
  major?: string;

  @ApiProperty({ example: '2022-09-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2026-06-01', nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ example: 'Studied software engineering fundamentals' })
  @IsOptional()
  @IsString()
  description?: string;
}

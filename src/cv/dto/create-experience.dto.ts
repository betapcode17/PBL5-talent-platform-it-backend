import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateExperienceDto {
  @ApiProperty({ example: 'ABC Tech' })
  @IsString()
  @IsNotEmpty()
  company!: string;

  @ApiProperty({ example: 'Backend Intern' })
  @IsString()
  @IsNotEmpty()
  position!: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2024-06-01', nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ example: 'Worked with NestJS and PostgreSQL' })
  @IsOptional()
  @IsString()
  description?: string;
}

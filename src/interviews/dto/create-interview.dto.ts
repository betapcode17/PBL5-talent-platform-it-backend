import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewTypeOption } from '../enums/interview.enum.js';

export class CreateInterviewDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  applicationId!: number;

  @ApiProperty({ enum: InterviewTypeOption, example: InterviewTypeOption.VIDEO })
  @IsEnum(InterviewTypeOption)
  type!: InterviewTypeOption;

  @ApiProperty({ example: '2026-04-20T09:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  schedule!: Date;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiProperty({ example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  duration!: number;
}

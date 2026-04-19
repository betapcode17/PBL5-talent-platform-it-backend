import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class RescheduleInterviewDto {
  @ApiProperty({ example: '2026-04-21T10:30:00.000Z' })
  @Type(() => Date)
  @IsDate()
  newDate!: Date;

  @ApiPropertyOptional({ example: 'https://meet.google.com/new-link' })
  @IsOptional()
  @IsString()
  newLink?: string;
}

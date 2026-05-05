import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePersonalityDto {
  @ApiProperty({ example: 'MBTI' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type!: string;

  @ApiPropertyOptional({ example: 'INTJ - Logical and strategic thinker' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

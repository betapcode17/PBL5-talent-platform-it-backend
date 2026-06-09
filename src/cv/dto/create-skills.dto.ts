import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSkillItemDto {
  @ApiProperty({ example: 'Java' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'programming_language', required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  category?: string;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  experienceMonths?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isStrong?: boolean;
}

export class CreateSkillsDto {
  @ApiProperty({
    example: [
      {
        name: 'NestJS',
        category: 'framework',
        experienceMonths: 12,
        isStrong: true,
      },
    ],
    description: 'Maximum 20 skills per request and per CV',
  })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item) =>
          typeof item === 'string' ? { name: item.trim() } : item,
        )
      : value,
  )
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateSkillItemDto)
  skills!: CreateSkillItemDto[];
}

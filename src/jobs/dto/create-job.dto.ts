import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SalaryRangeDto {
  @ApiProperty({ example: 1000, description: 'Muc luong toi thieu' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min!: number;

  @ApiProperty({ example: 2000, description: 'Muc luong toi da' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max!: number;
}

export class CreateJobDto {
  @ApiProperty({ example: 'Backend Developer' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Phat trien API bang NestJS' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobTypeId!: number;

  @ApiProperty({ type: SalaryRangeDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => SalaryRangeDto)
  salaryRange!: SalaryRangeDto;

  @ApiProperty({ example: 1 })
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId!: number;

  @ApiProperty({
    type: [String],
    example: ['2+ nam kinh nghiem NestJS', 'Biet Prisma va PostgreSQL'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  requirements!: string[];
}
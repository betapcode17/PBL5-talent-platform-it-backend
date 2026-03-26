import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Ltd' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  company_name: string;

  @ApiPropertyOptional({ example: 'We build great products' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  profile_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company_industry?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  establishment_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company_size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  working_days?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  working_time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overtime_policy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  company_website_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  company_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company_image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cover_image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  key_skills?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  why_love_working_here?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 'owner@example.com' })
  @IsOptional()
  @IsEmail()
  ownerEmail?: string;
}

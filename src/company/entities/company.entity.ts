import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Company {
  @ApiProperty()
  company_id: number;

  @ApiProperty()
  company_name: string;

  @ApiPropertyOptional()
  profile_description?: string | null;

  @ApiPropertyOptional()
  company_type?: string | null;

  @ApiPropertyOptional()
  company_industry?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  establishment_date?: string | null;

  @ApiPropertyOptional()
  company_size?: string | null;

  @ApiPropertyOptional()
  country?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  working_days?: string | null;

  @ApiPropertyOptional()
  working_time?: string | null;

  @ApiPropertyOptional()
  overtime_policy?: string | null;

  @ApiPropertyOptional()
  company_website_url?: string | null;

  @ApiPropertyOptional()
  company_email?: string | null;

  @ApiPropertyOptional()
  company_image?: string | null;

  @ApiPropertyOptional()
  cover_image?: string | null;

  @ApiPropertyOptional()
  key_skills?: string | null;

  @ApiPropertyOptional()
  why_love_working_here?: string | null;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  created_date: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateCertificateDto {
  @ApiProperty({ example: 'AWS Cloud Practitioner' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Amazon Web Services' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  issuer!: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiPropertyOptional({ example: 'https://example.com/certificate.pdf' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  fileUrl?: string;
}

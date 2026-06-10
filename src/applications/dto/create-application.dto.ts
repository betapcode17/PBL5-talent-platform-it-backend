import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobId!: number;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/raw/upload/cv.pdf',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): string | undefined =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : (value as string | undefined),
  )
  @IsString()
  cvUrl?: string;

  @ApiPropertyOptional({
    example: 'Toi rat quan tam vi tri nay va co kinh nghiem NestJS/Prisma.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): string | undefined =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : (value as string | undefined),
  )
  @IsString()
  coverLetter?: string;
}

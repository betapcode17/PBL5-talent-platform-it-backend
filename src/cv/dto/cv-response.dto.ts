import { ApiProperty } from '@nestjs/swagger';

export class CvSeekerResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Nguyen Van A', nullable: true })
  fullName!: string | null;

  @ApiProperty({ example: 'seeker@example.com' })
  email!: string;

  @ApiProperty({ example: 'https://github.com/johndoe', nullable: true })
  githubUrl!: string | null;

  @ApiProperty({ example: 'https://linkedin.com/in/johndoe', nullable: true })
  linkedinUrl!: string | null;

  @ApiProperty({ example: 'https://portfolio.example.com', nullable: true })
  portfolioUrl!: string | null;
}

export class CvResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  userId!: number;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/raw/upload/cv.pdf',
    nullable: true,
  })
  cvUrl!: string | null;

  @ApiProperty({ type: CvSeekerResponseDto })
  seeker!: CvSeekerResponseDto;

  @ApiProperty({ type: Array })
  educations!: unknown[];

  @ApiProperty({ type: Array })
  experiences!: unknown[];

  @ApiProperty({ type: Array })
  skills!: unknown[];

  @ApiProperty({ type: Array })
  personalities!: unknown[];

  @ApiProperty({ type: Array })
  certificates!: unknown[];

  @ApiProperty({ type: Array })
  projects!: unknown[];
}

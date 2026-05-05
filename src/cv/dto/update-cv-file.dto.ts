import { ApiProperty } from '@nestjs/swagger';

export class UpdateCvFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'CV file, accepted formats: PDF, DOC, DOCX',
  })
  file!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApplicationStatus } from '../../generated/prisma/client.js';

export class UpdateApplicationStatusDto {
  @ApiProperty({
    enum: ApplicationStatus,
    example: ApplicationStatus.INTERVIEWING,
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}

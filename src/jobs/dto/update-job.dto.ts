import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateJobDto } from './create-job.dto.js';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @ApiProperty({
    example: false,
    description: 'Trạng thái tuyển dụng: true = đang tuyển, false = ngừng tuyển',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

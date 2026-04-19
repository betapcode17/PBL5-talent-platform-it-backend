import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class RejectApplicationDto {
  @ApiPropertyOptional({
    example: 'Hien tai chua phu hop voi yeu cau kinh nghiem cua vi tri.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  reason?: string;
}

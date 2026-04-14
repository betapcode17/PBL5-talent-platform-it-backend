import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateBookmarkDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  jobId: number;
}

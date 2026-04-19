import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelInterviewDto {
  @ApiProperty({ example: 'Candidate requested another schedule.' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

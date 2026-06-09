import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class MarkNotificationReadDto {
  @ApiProperty({ example: 101 })
  @IsInt()
  @Min(1)
  notificationId: number;
}

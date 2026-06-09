import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { NotificationRole } from '../../generated/prisma/client.js';

export class JoinNotificationRoomDto {
  @ApiPropertyOptional({ enum: NotificationRole })
  @IsOptional()
  @IsEnum(NotificationRole)
  role?: NotificationRole;
}

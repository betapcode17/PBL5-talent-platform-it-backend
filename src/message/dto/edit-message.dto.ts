import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class EditMessageDto {
  @ApiProperty({ example: 1, description: 'ID của tin nhắn cần chỉnh sửa' })
  @IsInt({ message: 'messageId phải là số nguyên' })
  messageId: number;
  @ApiProperty({
    example: 'Nội dung tin nhắn mới',
    description: 'Nội dung mới của tin nhắn',
  })
  newContent: string;
}

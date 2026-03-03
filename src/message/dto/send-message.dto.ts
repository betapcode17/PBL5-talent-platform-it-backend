import { IsInt, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 1, description: 'ID của cuộc trò chuyện' })
  @IsInt({ message: 'chatId phải là số nguyên' })
  chatId: number;

  @ApiProperty({ example: 'Hello', description: 'Nội dung tin nhắn' })
  @IsString({ message: 'Nội dung phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Nội dung không được để trống' })
  @MaxLength(1000, { message: 'Nội dung không được vượt quá 1000 ký tự' })
  content: string;
}

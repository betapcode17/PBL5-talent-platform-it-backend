import { IsInt, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsInt()
  chatId: number;

  @IsString()
  @MinLength(1)
  content: string;
}

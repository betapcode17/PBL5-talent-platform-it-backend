import { IsInt } from 'class-validator';
export class CreateChatDto {
  @IsInt()
  seeker_id: number;
  @IsInt()
  company_id: number;
}

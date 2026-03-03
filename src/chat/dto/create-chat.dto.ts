import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty({ example: 1, description: 'ID của người tìm kiếm việc' })
  @IsInt({ message: 'seeker_id phải là số nguyên' })
  @Min(1, { message: 'seeker_id phải lớn hơn 0' })
  seeker_id: number;

  @ApiProperty({ example: 1, description: 'ID của công ty' })
  @IsInt({ message: 'company_id phải là số nguyên' })
  @Min(1, { message: 'company_id phải lớn hơn 0' })
  company_id: number;
}

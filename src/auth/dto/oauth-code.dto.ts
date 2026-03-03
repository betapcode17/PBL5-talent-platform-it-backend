import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}

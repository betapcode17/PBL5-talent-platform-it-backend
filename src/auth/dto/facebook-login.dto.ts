import { IsNotEmpty, IsString } from 'class-validator';

export class FacebookLoginDto {
  @IsString()
  @IsNotEmpty()
  access_token: string;
}

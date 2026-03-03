import { IsNotEmpty, IsString } from 'class-validator';

export class GithubLoginDto {
  @IsString()
  @IsNotEmpty()
  access_token: string;
}

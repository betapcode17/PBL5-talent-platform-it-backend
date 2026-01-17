import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
export enum UserRole {
  ADMIN = 'ADMIN',
  SEEKER = 'SEEKER',
  EMPLOYEE = 'EMPLOYEE',
}

export class RegisterDto {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsEmail()
  email: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsNotEmpty()
  password: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsNotEmpty()
  first_name: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsNotEmpty()
  last_name: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsOptional()
  phone: string | null;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsOptional()
  gender: string | null;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsOptional()
  user_image: string | null;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsEnum(UserRole)
  role: UserRole;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsBoolean()
  is_active: boolean;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsOptional()
  registration_date: Date;
}

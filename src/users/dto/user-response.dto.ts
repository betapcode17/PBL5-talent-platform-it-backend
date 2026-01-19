import { UserRole } from 'src/generated/prisma/enums.js';

export class UserResponseDto {
  user_id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  gender: string | null;
  phone: string | null;
  user_image: string | null;
  registration_date: Date;
}

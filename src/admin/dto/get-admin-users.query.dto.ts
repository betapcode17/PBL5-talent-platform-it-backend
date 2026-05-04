import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { UserRole } from '../../generated/prisma/enums.js';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

const toOptionalBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
};

export class GetAdminUsersQueryDto {
  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.SEEKER,
    description: 'Loc user theo role',
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    example: 'nguyen@example.com',
    description: 'Tim theo email, ho ten hoac so dien thoai',
  })
  @Transform(emptyToUndefined)
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Loc theo trang thai active/inactive',
  })
  @Transform(toOptionalBoolean)
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @Transform(emptyToUndefined)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Type(() => Number)
  @Transform(emptyToUndefined)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10;
}

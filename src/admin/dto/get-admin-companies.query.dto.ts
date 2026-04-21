import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

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

export class GetAdminCompaniesQueryDto {
  @ApiPropertyOptional({
    example: 'Software',
    description: 'Loc cong ty theo nganh',
  })
  @Transform(emptyToUndefined)
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'true: active, false: inactive',
  })
  @Transform(toOptionalBoolean)
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    example: 'Tech',
    description: 'Tim theo ten, email, thanh pho, quoc gia hoac mo ta',
  })
  @Transform(emptyToUndefined)
  @IsString()
  @IsOptional()
  search?: string;

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

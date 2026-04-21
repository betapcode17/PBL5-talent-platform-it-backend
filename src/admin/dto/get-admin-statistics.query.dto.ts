import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class GetAdminStatisticsQueryDto {
  @ApiPropertyOptional({
    example: 30,
    default: 30,
    description: 'So ngay gan nhat cho chart daily',
  })
  @Type(() => Number)
  @Transform(emptyToUndefined)
  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  dailyDays: number = 30;

  @ApiPropertyOptional({
    example: 12,
    default: 12,
    description: 'So tuan gan nhat cho chart weekly',
  })
  @Type(() => Number)
  @Transform(emptyToUndefined)
  @IsInt()
  @Min(1)
  @Max(52)
  @IsOptional()
  weeklyWeeks: number = 12;

  @ApiPropertyOptional({
    example: 12,
    default: 12,
    description: 'So thang gan nhat cho chart monthly',
  })
  @Type(() => Number)
  @Transform(emptyToUndefined)
  @IsInt()
  @Min(1)
  @Max(36)
  @IsOptional()
  monthlyMonths: number = 12;
}

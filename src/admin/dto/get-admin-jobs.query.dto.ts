import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';

const emptyToUndefined = ({ value }) =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  value === '' || value === null ? undefined : value;

export class GetAdminJobsQueryDto {
  @ApiPropertyOptional({
    example: 'Developer',
    description: 'Tìm kiếm theo tên job hoặc company',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 'Software',
    description: 'Lọc theo ngành nghề',
  })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({
    example: 'Senior',
    description: 'Lọc theo level (Junior, Senior, Manager, etc)',
  })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Lọc theo category ID',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Lọc theo job type ID',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  jobTypeId?: number;

  @ApiPropertyOptional({
    example: 20000000,
    description: 'Lọc theo mức lương tối thiểu',
  })
  @IsString()
  @IsOptional()
  minSalary?: string;

  @ApiPropertyOptional({
    example: 100000000,
    description: 'Lọc theo mức lương tối đa',
  })
  @IsString()
  @IsOptional()
  maxSalary?: string;

  @ApiPropertyOptional({
    example: '2024-05-01',
    description: 'Lọc công việc với deadline từ ngày này',
  })
  @IsString()
  @IsOptional()
  deadlineFrom?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Lọc công việc với deadline đến ngày này',
  })
  @IsString()
  @IsOptional()
  deadlineTo?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Lọc theo trạng thái active',
    enum: [true, false],
  })
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    example: 'createdDate',
    description: 'Sắp xếp theo trường',
    enum: ['createdDate', 'deadline', 'salary', 'numberOfHires', 'updatedDate'],
  })
  @IsIn(['createdDate', 'deadline', 'salary', 'numberOfHires', 'updatedDate'])
  @IsOptional()
  sortBy?:
    | 'createdDate'
    | 'deadline'
    | 'salary'
    | 'numberOfHires'
    | 'updatedDate' = 'createdDate';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Thứ tự sắp xếp',
    enum: ['asc', 'desc'],
  })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

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

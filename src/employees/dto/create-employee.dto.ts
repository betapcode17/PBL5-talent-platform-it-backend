import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional } from 'class-validator';
import { EmployeeCompanyRegisterDto } from '../../auth/dto/employee-company-register.dto.js';

export class CreateEmployeeDto extends EmployeeCompanyRegisterDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  joined_date?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  company_id?: number;
}

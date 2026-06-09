import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { EmployeeCompanyRegisterDto } from '../../auth/dto/employee-company-register.dto.js';

export class CreateEmployeeDto extends EmployeeCompanyRegisterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  company_id?: number;
}

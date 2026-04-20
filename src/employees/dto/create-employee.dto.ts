import { EmployeeCompanyRegisterDto } from '../../auth/dto/employee-company-register.dto.js';

export class CreateEmployeeDto extends EmployeeCompanyRegisterDto {
  joined_date: Date;
  company_id: number;
}

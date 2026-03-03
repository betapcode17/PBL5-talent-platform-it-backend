import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto } from './create-employee.dto.js';

// PartialType cập nhât không bắt buộc
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

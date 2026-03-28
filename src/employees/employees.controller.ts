import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @ApiOperation({ summary: 'Tạo employee và gửi account qua email' })
  @ApiBody({
    type: CreateEmployeeDto,
    examples: {
      example: {
        value: {
          full_name: 'Nguyen Van A',
          role: 'HR',
          email: 'hr.company@example.com',
          phone: '0901234567',
          company_name: 'ABC Tech',
          company_address: 'Da Nang',
          company_website_url: 'https://abctech.vn',
          company_id: 1,
          joined_date: '2026-03-28T00:00:00.000Z',
        },
      },
    },
  })
  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(+id);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin employee' })
  @ApiBody({
    type: UpdateEmployeeDto,
    examples: {
      example: {
        value: {
          role: 'Lead Recruiter',
          phone: '0911222333',
          company_name: 'ABC Tech Vietnam',
        },
      },
    },
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(+id, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(+id);
  }
}

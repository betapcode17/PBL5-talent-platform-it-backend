import { ConflictException, Injectable } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { PrismaService } from '../prisma.service.js';
import { NotFoundError } from 'rxjs';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: dto.employee_id },
    });
    if (!user) {
      throw new NotFoundError('user không tồn tại');
    }
    const existed = await this.prisma.employee.findUnique({
      where: { employee_id: dto.employee_id },
    });
    if (existed) {
      throw new ConflictException('employee đã tồn tại');
    }

    await this.prisma.employee.create({
      data: {
        employee_id: dto.employee_id,
        company_id: dto.company_id,
        role: dto.role,
      },
    });
    return { message: 'Created successfully' };
  }

  findAll() {
    return `This action returns all employees`;
  }

  findOne(id: number) {
    return `This action returns a #${id} employee`;
  }

  async update(employee_id: number, dto: UpdateEmployeeDto) {
    const existed = await this.prisma.employee.findUnique({
      where: { employee_id: dto.employee_id },
    });
    if (!existed) {
      throw new ConflictException('employee không tồn tại');
    }
    await this.prisma.employee.update({ where: { employee_id }, data: dto });
    return { message: 'Update successfully' };
  }

  async remove(id: number) {
    const existed = await this.prisma.employee.findUnique({
      where: { employee_id: id },
    });
    if (!existed) {
      throw new ConflictException('employee không tồn tại');
    }
    await this.prisma.employee.delete({ where: { employee_id: id } });
    return { message: 'Deleted successfully' };
  }
}

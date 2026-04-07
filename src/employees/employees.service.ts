import { ConflictException, Injectable } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { PrismaService } from '../prisma.service.js';
import { MailsService } from '../mails/mails.service.js';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailsService: MailsService,
  ) {}

  async create(dto: CreateEmployeeDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (user) {
      throw new ConflictException('user đã tồn tại');
    }
    const company = await this.prisma.company.findUnique({
      where: { company_id: dto.company_id },
    });

    if (!company) {
      throw new ConflictException('company không tồn tại');
    }

    const rawPassword = randomUUID().replace(/-/g, '').slice(0, 12);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          full_name: dto.full_name,
          phone: dto.phone,
          email: dto.email,
          password: hashedPassword,
          role: 'EMPLOYEE',
          is_active: true,
          registration_date: new Date(),
        },
      });

      const employee = await tx.employee.create({
        data: {
          company_id: dto.company_id,
          joined_date: dto.joined_date ?? new Date(),
          employee_id: createdUser.user_id,
          role: dto.role,
        },
      });

      return { createdUser, employee };
    });

    this.mailsService.sendNewAccountToEmployee(dto.email, rawPassword);

    return {
      message: 'Created successfully and account email sent',
      user_id: created.createdUser.user_id,
      employee_id: created.employee.employee_id,
    };
  }

  findAll() {
    return `This action returns all employees`;
  }

  findOne(id: number) {
    return `This action returns a #${id} employee`;
  }

  async update(employee_id: number, dto: UpdateEmployeeDto) {
    const existed = await this.prisma.employee.findUnique({
      where: { employee_id },
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

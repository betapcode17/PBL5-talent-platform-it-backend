import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanyIdByEmployeeId(employeeId: number): Promise<number> {
    const employee = await this.prisma.employee.findUnique({
      where: { employee_id: employeeId },
      select: { company_id: true },
    });

    if (!employee) {
      throw new NotFoundException('Nhân viên không tồn tại');
    }

    return employee.company_id;
  }

  async getAllChatOfCompany(company_id: number) {
    const chats = await this.prisma.chat.findMany({
      where: { company_id: company_id },
      include: {
        Seeker: {
          include: {
            User: {
              select: {
                user_id: true,
                full_name: true,
              },
            },
          },
        },
        Message: {
          orderBy: { sent_at: 'asc' },
          select: {
            message_id: true,
            content: true,
            sent_at: true,
            sender_type: true,
          },
        },
      },
      orderBy: { last_message_at: 'asc' },
    });
    return chats;
  }
  async getAllChatOfSeeker(seeker_id: number) {
    const chats = await this.prisma.chat.findMany({
      where: { seeker_id: seeker_id },
      include: {
        Company: {
          select: {
            company_id: true,
            company_email: true,
            company_image: true,
            company_name: true,
          },
        },
        Message: {
          take: 1,
          orderBy: { sent_at: 'desc' },
          select: {
            message_id: true,
            content: true,
            sent_at: true,
            sender_type: true,
          },
        },
      },
      orderBy: { last_message_at: 'asc' },
    });
    return chats;
  }

  async CreateChat(dto: CreateChatDto) {
    const [seeker, company] = await Promise.all([
      this.prisma.seeker.findUnique({
        where: { seeker_id: dto.seeker_id },
      }),
      this.prisma.company.findUnique({
        where: { company_id: dto.company_id },
      }),
    ]);

    if (!seeker) {
      throw new NotFoundException('Ứng viên không tồn tại');
    }

    if (!company) {
      throw new NotFoundException('Công ty không tồn tại');
    }
    const existed = await this.prisma.chat.findUnique({
      where: {
        seeker_id_company_id: {
          seeker_id: dto.seeker_id,
          company_id: dto.company_id,
        },
      },
      include: { Company: true },
    });
    if (existed) return existed;

    return this.prisma.chat.create({
      data: {
        seeker_id: dto.seeker_id,
        company_id: dto.company_id,
      },
      include: { Company: true },
    });
  }
  async getChatDetail(chatId: number, userId: number, userRole: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { chat_id: chatId },
      include: {
        Company: {
          select: {
            company_id: true,
            company_name: true,
            company_email: true,
            company_image: true,
          },
        },
        Seeker: {
          include: {
            User: {
              select: {
                user_id: true,
                full_name: true,
              },
            },
          },
        },
        Message: {
          orderBy: { sent_at: 'asc' },
          select: {
            message_id: true,
            content: true,
            sent_at: true,
            sender_type: true,
            sender_id: true,
            is_read: true,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat không tồn tại');
    }

    // Authorization: Only seeker or company employee can view chat
    if (userRole === 'SEEKER') {
      if (chat.seeker_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền xem chat này');
      }
    } else if (userRole === 'EMPLOYEE') {
      const isEmployeeOfCompany = await this.prisma.employee.findUnique({
        where: { employee_id: userId },
      });
      if (
        !isEmployeeOfCompany ||
        isEmployeeOfCompany.company_id !== chat.company_id
      ) {
        throw new ForbiddenException('Bạn không có quyền xem chat này');
      }
    }

    return chat;
  }
}

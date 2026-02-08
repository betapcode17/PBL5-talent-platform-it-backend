import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}
  async getAllChatOfSeeker(seeker_id: number) {
    const chats = await this.prisma.chat.findMany({
      where: { seeker_id: seeker_id },
      include: {
        Company: {
          select: {
            company_id: true,
            company_email: true,
            company_image: true,
          },
        },
        Message: {
          take: 1,
          orderBy: { sent_at: 'desc' },
        },
      },
      orderBy: { last_message_at: 'desc' },
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
  async getChatDetail(chatId: number) {
    return this.prisma.chat.findUnique({
      where: { chat_id: chatId },
      include: {
        Company: true,
        Message: { orderBy: { sent_at: 'asc' } },
      },
    });
  }
}

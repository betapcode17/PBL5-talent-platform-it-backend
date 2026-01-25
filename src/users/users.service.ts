import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { CloudinaryService } from '../upload/cloudinary.service.js';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}
  async getMe(userId: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
        gender: true,
        phone: true,
        user_image: true,
        registration_date: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }
  async update(userId: number, dto: UpdateUserDto) {
    if (!dto) {
      throw new BadRequestException('Body không được để trống');
    }

    const existedUser = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!existedUser) {
      throw new ConflictException('User không tồn tại');
    }

    // ✅ chỉ check email khi có giá trị hợp lệ
    if (dto.email && dto.email.trim() !== '') {
      const existedEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existedEmail && existedEmail.user_id !== userId) {
        throw new ConflictException('Email đã tồn tại');
      }
    }

    // ✅ lọc field rỗng
    const updateData = Object.fromEntries(
      Object.entries(dto).filter(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, value]) => value !== undefined && value !== null && value !== '',
      ),
    );

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Không có dữ liệu để cập nhật');
    }

    return this.prisma.user.update({
      where: { user_id: userId },
      data: updateData,
    });
  }

  async activateUser(userId: number) {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: { is_active: true },
    });
  }
  async deactivateUser(id: number) {
    return this.prisma.user.update({
      where: { user_id: id },
      data: { is_active: false },
    });
  }
  async getUsers(page = 1, limit = 10, role?: string) {
    // Import UserRole enum from Prisma client
    // and cast role to UserRole if provided
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const where = role ? { role: role as any } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }
  async uploadAvatar(userId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File không tồn tại');
    }

    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new BadRequestException('User không tồn tại');
    }

    // Upload cloudinary
    const { url } = await this.cloudinary.uploadAvatar(file);

    // Update DB
    await this.prisma.user.update({
      where: { user_id: userId },
      data: { user_image: url },
    });

    return {
      avatarUrl: url,
    };
  }
}

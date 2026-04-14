import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { CreateJobTypeDto } from './dto/create-job-type.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { UpdateJobTypeDto } from './dto/update-job-type.dto.js';

type CategoryRecord = {
  category_id: number;
  name: string;
  parent_category_id: number | null;
  is_active: boolean;
};

@Injectable()
export class JobTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async createJobType(dto: CreateJobTypeDto) {
    await this.ensureJobTypeNameUnique(dto.name);

    const created = await this.prisma.jobType.create({
      data: {
        job_type: dto.name.trim(),
        description: dto.description?.trim() || null,
        is_active: true,
      },
      select: {
        job_type_id: true,
      },
    });

    return { typeId: created.job_type_id };
  }

  async getJobTypes(active?: boolean) {
    const types = await this.prisma.jobType.findMany({
      where: typeof active === 'boolean' ? { is_active: active } : undefined,
      orderBy: {
        job_type: 'asc',
      },
      select: {
        job_type_id: true,
        job_type: true,
        description: true,
        is_active: true,
      },
    });

    return {
      types: types.map((type) => ({
        id: type.job_type_id,
        name: type.job_type,
        description: type.description,
        isActive: type.is_active,
      })),
    };
  }

  async updateJobType(id: number, dto: UpdateJobTypeDto) {
    const existing = await this.prisma.jobType.findUnique({
      where: { job_type_id: id },
      select: {
        job_type_id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Job type khong ton tai');
    }

    if (dto.name !== undefined) {
      await this.ensureJobTypeNameUnique(dto.name, id);
    }

    await this.prisma.jobType.update({
      where: { job_type_id: id },
      data: {
        ...(dto.name !== undefined ? { job_type: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
      },
    });

    return { updated: true };
  }

  async deleteJobType(id: number) {
    const existing = await this.prisma.jobType.findUnique({
      where: { job_type_id: id },
      select: {
        job_type_id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Job type khong ton tai');
    }

    await this.prisma.jobType.update({
      where: { job_type_id: id },
      data: {
        is_active: false,
      },
    });

    return { message: 'Deleted' };
  }

  async createCategory(dto: CreateCategoryDto) {
    await this.ensureCategoryNameUnique(dto.name);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.ensureCategoryExists(dto.parentId);
    }

    const created = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        parent_category_id: dto.parentId ?? null,
        is_active: true,
      },
      select: {
        category_id: true,
      },
    });

    return { catId: created.category_id };
  }

  async getCategories(parentId?: number) {
    if (parentId !== undefined) {
      await this.ensureCategoryExists(parentId);
    }

    const categories = await this.prisma.category.findMany({
      where: {
        is_active: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        category_id: true,
        name: true,
        parent_category_id: true,
        is_active: true,
      },
    });

    const categoriesTree = this.buildCategoryTree(categories, parentId ?? null);

    return { categories: categoriesTree };
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { category_id: id },
      select: {
        category_id: true,
        parent_category_id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Category khong ton tai');
    }

    if (dto.name !== undefined) {
      await this.ensureCategoryNameUnique(dto.name, id);
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('Category khong the la parent cua chinh no');
      }

      if (dto.parentId !== null) {
        await this.ensureCategoryExists(dto.parentId);
        await this.ensureNoCircularHierarchy(id, dto.parentId);
      }
    }

    await this.prisma.category.update({
      where: { category_id: id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.parentId !== undefined
          ? { parent_category_id: dto.parentId }
          : {}),
      },
    });

    return { updated: true };
  }

  async deleteCategory(id: number) {
    const existing = await this.prisma.category.findUnique({
      where: { category_id: id },
      select: {
        category_id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Category khong ton tai');
    }

    await this.prisma.$transaction([
      this.prisma.category.updateMany({
        where: { parent_category_id: id },
        data: {
          parent_category_id: null,
        },
      }),
      this.prisma.category.update({
        where: { category_id: id },
        data: {
          is_active: false,
        },
      }),
    ]);

    return { message: 'Deleted' };
  }

  private async ensureJobTypeNameUnique(name: string, excludeId?: number) {
    const existing = await this.prisma.jobType.findFirst({
      where: {
        job_type: {
          equals: name.trim(),
          mode: 'insensitive',
        },
        ...(excludeId !== undefined
          ? {
              NOT: {
                job_type_id: excludeId,
              },
            }
          : {}),
      },
      select: {
        job_type_id: true,
      },
    });

    if (existing) {
      throw new ConflictException('Job type name da ton tai');
    }
  }

  private async ensureCategoryNameUnique(name: string, excludeId?: number) {
    const existing = await this.prisma.category.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
        ...(excludeId !== undefined
          ? {
              NOT: {
                category_id: excludeId,
              },
            }
          : {}),
      },
      select: {
        category_id: true,
      },
    });

    if (existing) {
      throw new ConflictException('Category name da ton tai');
    }
  }

  private async ensureCategoryExists(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { category_id: categoryId },
      select: {
        category_id: true,
        is_active: true,
      },
    });

    if (!category || !category.is_active) {
      throw new NotFoundException('Category khong ton tai');
    }

    return category;
  }

  private buildCategoryTree(
    categories: CategoryRecord[],
    parentId: number | null,
  ) {
    return categories
      .filter((category) => category.parent_category_id === parentId)
      .map((category) => ({
        id: category.category_id,
        name: category.name,
        parentId: category.parent_category_id,
        isActive: category.is_active,
        children: this.buildCategoryTree(categories, category.category_id),
      }));
  }

  private async ensureNoCircularHierarchy(
    categoryId: number,
    nextParentId: number,
  ) {
    const categories = await this.prisma.category.findMany({
      where: {
        is_active: true,
      },
      select: {
        category_id: true,
        parent_category_id: true,
      },
    });

    let cursor: number | null = nextParentId;

    while (cursor !== null) {
      if (cursor === categoryId) {
        throw new BadRequestException('Khong the tao vong lap category hierarchy');
      }

      const parent = categories.find((item) => item.category_id === cursor);
      cursor = parent?.parent_category_id ?? null;
    }
  }
}

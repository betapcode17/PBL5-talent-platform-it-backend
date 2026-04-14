import { BadRequestException } from '@nestjs/common';
import type { FileFilterCallback } from 'multer';

export const imageUploadOptions = {
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (
    _: unknown,
    file: { mimetype: string },
    cb: FileFilterCallback,
  ) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      return cb(new BadRequestException('Chỉ cho phép upload ảnh'));
    }
    cb(null, true);
  },
};

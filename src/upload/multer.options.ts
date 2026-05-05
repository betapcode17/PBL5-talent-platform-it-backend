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

const allowedCvMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const allowedCvExtensions = ['.pdf', '.doc', '.docx'];

export const cvUploadOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (
    _: unknown,
    file: { mimetype: string; originalname: string },
    cb: FileFilterCallback,
  ) => {
    const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];

    if (
      !allowedCvMimeTypes.includes(file.mimetype) ||
      !extension ||
      !allowedCvExtensions.includes(extension)
    ) {
      return cb(
        new BadRequestException('Chi cho phep upload file PDF/DOC/DOCX'),
      );
    }

    cb(null, true);
  },
};

const allowedCertificateMimeTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
];

const allowedCertificateExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];

export const certificateUploadOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (
    _: unknown,
    file: { mimetype: string; originalname: string },
    cb: FileFilterCallback,
  ) => {
    const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];

    if (
      !allowedCertificateMimeTypes.includes(file.mimetype) ||
      !extension ||
      !allowedCertificateExtensions.includes(extension)
    ) {
      return cb(
        new BadRequestException('Chi cho phep upload file PDF/PNG/JPG/JPEG'),
      );
    }

    cb(null, true);
  },
};

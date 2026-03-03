import { BadRequestException } from '@nestjs/common';

export const imageUploadOptions = {
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (_: any, file: Express.Multer.File, cb: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return cb(new BadRequestException('Chỉ cho phép upload ảnh'), false);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    cb(null, true);
  },
};

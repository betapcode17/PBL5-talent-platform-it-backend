import { Injectable } from '@nestjs/common';
import cloudinary from './cloudinary.config.js';
console.log('Cloudinary config:', cloudinary.config());
@Injectable()
export class CloudinaryService {
  async uploadAvatar(file: Express.Multer.File) {
    return new Promise<{ url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'avatars',
              resource_type: 'image',
            },
            (error, result) => {
              // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
              if (error) return reject(error);
              resolve({
                url: result!.secure_url,
                public_id: result!.public_id,
              });
            },
          )
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          .end(file.buffer);
      },
    );
  }

  async delete(publicId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return cloudinary.uploader.destroy(publicId);
  }
}

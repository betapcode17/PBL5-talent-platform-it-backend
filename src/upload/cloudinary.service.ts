import { Injectable } from '@nestjs/common';
import cloudinary from './cloudinary.config.js';

@Injectable()
export class CloudinaryService {
  async uploadAvatar(file: {
    buffer: Buffer;
  }): Promise<{ url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'avatars',
            resource_type: 'image',
          },
          (error, result) => {
            if (error)
              return reject(new Error(error.message || 'Upload error'));
            if (!result) return reject(new Error('Upload failed'));
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          },
        )
        .end(file.buffer);
    });
  }

  async delete(publicId: string): Promise<{ result: string }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return cloudinary.uploader.destroy(publicId);
  }
}

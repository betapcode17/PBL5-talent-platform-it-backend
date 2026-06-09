import { Injectable } from '@nestjs/common';
import cloudinary from './cloudinary.config.js';
import { extname, basename } from 'node:path';

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

  async uploadCvFile(file: {
    buffer: Buffer;
    originalname?: string;
  }): Promise<{ url: string; public_id: string }> {
    const fileExtension = extname(file.originalname ?? '').toLowerCase();
    const baseName = basename(file.originalname ?? 'cv', fileExtension)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cv';

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'cv',
            resource_type: 'raw',
            use_filename: true,
            unique_filename: true,
            filename_override: file.originalname ?? `cv${fileExtension || '.pdf'}`,
            public_id: `${baseName}${fileExtension || '.pdf'}`,
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

  async uploadCertificateFile(file: {
    buffer: Buffer;
  }): Promise<{ url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'certificates',
            resource_type: 'auto',
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

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  mkdir,
  rename,
  unlink,
  writeFile,
  stat,
  copyFile,
  readFile,
} from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { put, del } from '@vercel/blob';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService implements OnModuleInit {
  private uploadRoot: string;
  private blobToken: string | undefined;
  private r2?: {
    client: S3Client;
    bucket: string;
    publicBase: string;
  };

  constructor(private readonly config: ConfigService) {
    this.uploadRoot = this.config.get<string>('UPLOAD_DIR') || './uploads';
    this.blobToken =
      this.config.get<string>('BLOB_READ_WRITE_TOKEN') || undefined;

    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('R2_BUCKET_NAME');
    const publicBase = (
      this.config.get<string>('R2_PUBLIC_URL') || ''
    ).replace(/\/$/, '');

    if (accountId && accessKeyId && secretAccessKey && bucket && publicBase) {
      this.r2 = {
        bucket,
        publicBase,
        client: new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId, secretAccessKey },
        }),
      };
      console.log('Storage: Cloudflare R2 enabled →', publicBase);
    } else if (this.blobToken) {
      console.log('Storage: Vercel Blob enabled');
    } else {
      console.log('Storage: local disk');
    }
  }

  private get useR2() {
    return !!this.r2;
  }

  private get useBlob() {
    return !this.useR2 && !!this.blobToken;
  }

  async onModuleInit() {
    await mkdir(this.uploadRoot, { recursive: true });
    await mkdir(join(this.uploadRoot, 'originals'), { recursive: true });
    await mkdir(join(this.uploadRoot, 'thumbs'), { recursive: true });
    await mkdir(join(this.uploadRoot, 'tmp'), { recursive: true });
  }

  getUploadRoot(): string {
    return this.uploadRoot;
  }

  getAbsolutePath(storageKey: string): string {
    return join(this.uploadRoot, storageKey);
  }

  private async putR2(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.r2) throw new Error('R2 not configured');
    await this.r2.client.send(
      new PutObjectCommand({
        Bucket: this.r2.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return `${this.r2.publicBase}/${key}`;
  }

  async moveUploadedFile(
    tempPath: string,
    ext: string,
    mimeType?: string,
  ): Promise<{ storageKey: string; size: number }> {
    const info = await stat(tempPath);
    const key = `originals/${uuidv4()}.${ext}`;
    const contentType = mimeType || 'application/octet-stream';

    if (this.useR2 || this.useBlob) {
      const buffer = await readFile(tempPath);
      let storageKey: string;
      if (this.useR2) {
        storageKey = await this.putR2(key, buffer, contentType);
      } else {
        const blob = await put(key, buffer, {
          access: 'public',
          contentType,
          token: this.blobToken,
        });
        storageKey = blob.url;
      }
      await unlink(tempPath).catch(() => undefined);
      return { storageKey, size: info.size };
    }

    const fullPath = this.getAbsolutePath(key);
    await mkdir(dirname(fullPath), { recursive: true });
    try {
      await rename(tempPath, fullPath);
    } catch {
      await copyFile(tempPath, fullPath);
      await unlink(tempPath);
    }
    return { storageKey: key, size: info.size };
  }

  async saveOriginal(
    buffer: Buffer,
    mimeType: string,
    ext: string,
  ): Promise<{ storageKey: string; size: number }> {
    const key = `originals/${uuidv4()}.${ext}`;

    if (this.useR2) {
      const url = await this.putR2(key, buffer, mimeType);
      return { storageKey: url, size: buffer.length };
    }

    if (this.useBlob) {
      const blob = await put(key, buffer, {
        access: 'public',
        contentType: mimeType,
        token: this.blobToken,
      });
      return { storageKey: blob.url, size: buffer.length };
    }

    const fullPath = this.getAbsolutePath(key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return { storageKey: key, size: buffer.length };
  }

  async createImageThumb(buffer: Buffer): Promise<string | null> {
    try {
      const sharpMod = await import('sharp');
      const sharp = sharpMod.default;
      const thumbBuffer = await sharp(buffer)
        .rotate()
        .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
      const key = `thumbs/${uuidv4()}.webp`;

      if (this.useR2) {
        return await this.putR2(key, thumbBuffer, 'image/webp');
      }

      if (this.useBlob) {
        const blob = await put(key, thumbBuffer, {
          access: 'public',
          contentType: 'image/webp',
          token: this.blobToken,
        });
        return blob.url;
      }

      const fullPath = this.getAbsolutePath(key);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, thumbBuffer);
      return key;
    } catch (err) {
      console.warn('Thumb generation skipped:', err);
      return null;
    }
  }

  async delete(storageKey?: string | null) {
    if (!storageKey) return;

    if (storageKey.startsWith('http')) {
      if (this.useR2 && this.r2) {
        try {
          const key = storageKey.replace(`${this.r2.publicBase}/`, '');
          await this.r2.client.send(
            new DeleteObjectCommand({
              Bucket: this.r2.bucket,
              Key: key,
            }),
          );
        } catch {
          /* ignore */
        }
        return;
      }
      if (this.useBlob) {
        try {
          await del(storageKey, { token: this.blobToken });
        } catch {
          /* ignore */
        }
      }
      return;
    }

    const fullPath = this.getAbsolutePath(storageKey);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  }

  publicUrl(storageKey: string): string {
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      return storageKey;
    }
    if (this.r2) {
      return `${this.r2.publicBase}/${storageKey.replace(/\\/g, '/')}`;
    }
    const path = `/uploads/${storageKey.replace(/\\/g, '/')}`;
    const base = (this.config.get<string>('PUBLIC_API_URL') || '').replace(
      /\/$/,
      '',
    );
    return base ? `${base}${path}` : path;
  }
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, rename, unlink, writeFile, stat, copyFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { put, del } from '@vercel/blob';

@Injectable()
export class StorageService implements OnModuleInit {
  private uploadRoot: string;
  private blobToken: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.uploadRoot = this.config.get<string>('UPLOAD_DIR') || './uploads';
    this.blobToken = this.config.get<string>('BLOB_READ_WRITE_TOKEN') || undefined;
  }

  private get useBlob() {
    return !!this.blobToken;
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

  async moveUploadedFile(
    tempPath: string,
    ext: string,
    mimeType?: string,
  ): Promise<{ storageKey: string; size: number }> {
    const info = await stat(tempPath);
    const key = `originals/${uuidv4()}.${ext}`;

    if (this.useBlob) {
      const buffer = await readFile(tempPath);
      const blob = await put(key, buffer, {
        access: 'public',
        contentType: mimeType || 'application/octet-stream',
        token: this.blobToken,
      });
      await unlink(tempPath).catch(() => undefined);
      // Store full public URL so clients can load media cross-origin
      return { storageKey: blob.url, size: info.size };
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
      // Dynamic import so a missing sharp binary does not crash boot
      const sharpMod = await import('sharp');
      const sharp = sharpMod.default;
      const thumbBuffer = await sharp(buffer)
        .rotate()
        .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
      const key = `thumbs/${uuidv4()}.webp`;

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
    const path = `/uploads/${storageKey.replace(/\\/g, '/')}`;
    const base = (this.config.get<string>('PUBLIC_API_URL') || '').replace(
      /\/$/,
      '',
    );
    return base ? `${base}${path}` : path;
  }
}

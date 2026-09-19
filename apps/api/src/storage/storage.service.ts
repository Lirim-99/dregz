import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, rename, unlink, writeFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService implements OnModuleInit {
  private uploadRoot: string;

  constructor(private readonly config: ConfigService) {
    this.uploadRoot = this.config.get<string>('UPLOAD_DIR') || './uploads';
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
  ): Promise<{ storageKey: string; size: number }> {
    const storageKey = `originals/${uuidv4()}.${ext}`;
    const fullPath = this.getAbsolutePath(storageKey);
    await mkdir(dirname(fullPath), { recursive: true });
    await rename(tempPath, fullPath);
    const info = await stat(fullPath);
    return { storageKey, size: info.size };
  }

  async saveOriginal(
    buffer: Buffer,
    _mimeType: string,
    ext: string,
  ): Promise<{ storageKey: string; size: number }> {
    const storageKey = `originals/${uuidv4()}.${ext}`;
    const fullPath = this.getAbsolutePath(storageKey);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return { storageKey, size: buffer.length };
  }

  async createImageThumb(buffer: Buffer): Promise<string | null> {
    try {
      const thumbKey = `thumbs/${uuidv4()}.webp`;
      const fullPath = this.getAbsolutePath(thumbKey);
      await mkdir(dirname(fullPath), { recursive: true });
      await sharp(buffer)
        .rotate()
        .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(fullPath);
      return thumbKey;
    } catch {
      return null;
    }
  }

  async delete(storageKey?: string | null) {
    if (!storageKey) return;
    const fullPath = this.getAbsolutePath(storageKey);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  }

  publicUrl(storageKey: string): string {
    return `/uploads/${storageKey.replace(/\\/g, '/')}`;
  }
}

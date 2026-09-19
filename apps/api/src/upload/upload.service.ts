import {
  BadRequestException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { readFile, unlink } from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EventsService } from '../events/events.service';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
]);

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/3gpp',
]);

@Injectable()
export class UploadService {
  private maxImage: number;
  private maxVideo: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventsService,
    config: ConfigService,
  ) {
    this.maxImage = Number(config.get('MAX_IMAGE_BYTES')) || 20 * 1024 * 1024;
    this.maxVideo = Number(config.get('MAX_VIDEO_BYTES')) || 200 * 1024 * 1024;
  }

  async upload(
    code: string,
    file: Express.Multer.File,
    guestName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Nuk u dërgua asnjë skedar');
    }

    const event = await this.events.findByCode(code);
    if (!event.uploadEnabled) {
      await this.safeUnlink(file.path);
      throw new ForbiddenException('Ngarkimet janë të çaktivizuara');
    }

    const mimeType = (file.mimetype || '').toLowerCase();
    let type: 'image' | 'video';

    try {
      if (IMAGE_TYPES.has(mimeType)) {
        type = 'image';
        if (file.size > this.maxImage) {
          throw new BadRequestException(
            `Fotoja është shumë e madhe (maks. ${Math.round(this.maxImage / 1024 / 1024)}MB)`,
          );
        }
      } else if (VIDEO_TYPES.has(mimeType)) {
        type = 'video';
        if (file.size > this.maxVideo) {
          throw new BadRequestException(
            `Video është shumë e madhe (maks. ${Math.round(this.maxVideo / 1024 / 1024)}MB)`,
          );
        }
      } else {
        throw new BadRequestException(
          `Lloji i skedarit nuk mbështetet: ${mimeType}`,
        );
      }

      const ext =
        extname(file.originalname).replace('.', '').toLowerCase() ||
        (type === 'image' ? 'jpg' : 'mp4');

      const { storageKey, size } = await this.storage.moveUploadedFile(
        file.path,
        ext,
      );

      let thumbKey: string | null = null;
      if (type === 'image') {
        const buffer = await readFile(this.storage.getAbsolutePath(storageKey));
        thumbKey = await this.storage.createImageThumb(buffer);
      }

      const media = await this.prisma.media.create({
        data: {
          eventId: event.id,
          type,
          storageKey,
          thumbKey,
          mimeType,
          size,
          guestName: guestName?.trim() || null,
        },
      });

      return {
        id: media.id,
        type: media.type,
        mimeType: media.mimeType,
        size: media.size,
        guestName: media.guestName,
        createdAt: media.createdAt,
        url: this.storage.publicUrl(media.storageKey),
        thumbUrl: media.thumbKey
          ? this.storage.publicUrl(media.thumbKey)
          : null,
      };
    } catch (err) {
      await this.safeUnlink(file.path);
      throw err;
    }
  }

  private async safeUnlink(path?: string) {
    if (!path) return;
    try {
      await unlink(path);
    } catch {
      /* ignore */
    }
  }
}

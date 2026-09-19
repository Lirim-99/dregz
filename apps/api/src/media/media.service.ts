import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(type?: string, since?: string) {
    const where: {
      type?: string;
      createdAt?: { gt: Date };
    } = {};

    if (type === 'image' || type === 'video') {
      where.type = type;
    }
    if (since) {
      const d = new Date(since);
      if (!Number.isNaN(d.getTime())) {
        where.createdAt = { gt: d };
      }
    }

    const items = await this.prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { event: { select: { code: true, title: true } } },
    });

    return items.map((m) => ({
      id: m.id,
      type: m.type,
      mimeType: m.mimeType,
      size: m.size,
      guestName: m.guestName,
      createdAt: m.createdAt,
      eventCode: m.event.code,
      eventTitle: m.event.title,
      url: this.storage.publicUrl(m.storageKey),
      thumbUrl: m.thumbKey ? this.storage.publicUrl(m.thumbKey) : null,
    }));
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException('Media nuk u gjet');
    }
    await this.storage.delete(media.storageKey);
    await this.storage.delete(media.thumbKey);
    await this.prisma.media.delete({ where: { id } });
    return { ok: true };
  }
}

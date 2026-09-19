import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string) {
    const event = await this.prisma.event.findUnique({ where: { code } });
    if (!event) {
      throw new NotFoundException('Ngjarja nuk u gjet');
    }
    return event;
  }

  async getPublicInfo(code: string) {
    const event = await this.findByCode(code);
    return {
      code: event.code,
      title: event.title,
      uploadEnabled: event.uploadEnabled,
    };
  }
}

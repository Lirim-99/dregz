import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    // Better concurrent writes when guests upload at the same time
    try {
      await this.$executeRawUnsafe('PRAGMA journal_mode=WAL;');
      await this.$executeRawUnsafe('PRAGMA synchronous=NORMAL;');
      await this.$executeRawUnsafe('PRAGMA busy_timeout=30000;');
      await this.$executeRawUnsafe('PRAGMA temp_store=MEMORY;');
    } catch {
      // Non-SQLite providers ignore these
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

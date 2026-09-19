import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MediaModule } from './media/media.module';
import { UploadModule } from './upload/upload.module';
import { QrModule } from './qr/qr.module';
import { EventsModule } from './events/events.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    EventsModule,
    MediaModule,
    UploadModule,
    QrModule,
  ],
})
export class AppModule {}

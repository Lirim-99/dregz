import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UploadGate } from './upload.gate';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [UploadController],
  providers: [UploadService, UploadGate],
})
export class UploadModule {}

import {
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { UploadService } from './upload.service';

function uploadRoot() {
  return process.env.UPLOAD_DIR || './uploads';
}

@Controller('upload')
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  @Post(':code')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dest = join(uploadRoot(), 'tmp');
          try {
            mkdirSync(dest, { recursive: true });
            cb(null, dest);
          } catch (err) {
            cb(err as Error, dest);
          }
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || '';
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: {
        fileSize: 200 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async uploadFile(
    @Param('code') code: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('guestName') guestName?: string,
  ) {
    if (!file) {
      throw new PayloadTooLargeException(
        'Skedari mungon ose është më i madh se 200MB',
      );
    }
    return this.upload.upload(code, file, guestName);
  }
}

import {
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadService } from './upload.service';

const uploadRoot = process.env.UPLOAD_DIR || './uploads';

@Controller('upload')
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  @Post(':code')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(uploadRoot, 'tmp'));
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || '';
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: {
        fileSize: 200 * 1024 * 1024,
      },
    }),
  )
  async uploadFile(
    @Param('code') code: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('guestName') guestName?: string,
  ) {
    return this.upload.upload(code, file, guestName);
  }
}

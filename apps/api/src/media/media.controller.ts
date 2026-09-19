import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(
    @Query('type') type?: string,
    @Query('since') since?: string,
  ) {
    return this.media.list(type, since);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.media.remove(id);
  }
}

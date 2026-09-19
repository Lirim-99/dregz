import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('qr')
export class QrController {
  constructor(private readonly qr: QrService) {}

  @Get(':code/image')
  async png(@Param('code') code: string, @Res() res: Response) {
    const buffer = await this.qr.getPng(code);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="wedding-${code}-qr.png"`,
    );
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }

  @Get(':code')
  @UseGuards(JwtAuthGuard)
  async info(@Param('code') code: string) {
    return this.qr.getDataUrl(code);
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { EventsService } from '../events/events.service';

@Injectable()
export class QrService {
  constructor(
    private readonly events: EventsService,
    private readonly config: ConfigService,
  ) {}

  private uploadUrl(): string {
    const base =
      this.config.get<string>('PUBLIC_WEB_URL') || 'http://localhost:3000';
    return base.replace(/\/$/, '');
  }

  async getPng(code: string): Promise<Buffer> {
    await this.events.findByCode(code);
    return QRCode.toBuffer(this.uploadUrl(), {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }

  async getDataUrl(code: string) {
    await this.events.findByCode(code);
    const url = this.uploadUrl();
    const dataUrl = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    return { url, dataUrl };
  }
}

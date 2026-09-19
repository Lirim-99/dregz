import { Injectable } from '@nestjs/common';

/**
 * Limits how many uploads are finalized at once (DB + thumb work),
 * while multer already streams files to disk for many clients.
 */
@Injectable()
export class UploadGate {
  private active = 0;
  private readonly max = Number(process.env.MAX_CONCURRENT_UPLOADS) || 6;
  private readonly waiters: Array<() => void> = [];

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release() {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    if (next) next();
  }
}

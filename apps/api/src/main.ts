import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import type { Server } from 'http';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: false,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const uploadPath =
    uploadDir.startsWith('/') || /^[A-Za-z]:[\\/]/.test(uploadDir)
      ? uploadDir
      : join(process.cwd(), uploadDir);
  app.useStaticAssets(uploadPath, {
    prefix: '/uploads/',
    maxAge: '7d',
  });

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  if (corsOrigin === '*') {
    app.enableCors({ origin: true });
  } else {
    app.enableCors({
      origin: corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    });
  }

  // Simple liveness for Render (no DB)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: unknown, res: { status: (n: number) => { send: (s: string) => void } }) => {
    res.status(200).send('ok');
  });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');

  const server = app.getHttpServer() as Server;
  const fifteenMin = 15 * 60 * 1000;
  server.setTimeout(fifteenMin);
  server.headersTimeout = fifteenMin + 60_000;
  server.requestTimeout = fifteenMin;
  server.keepAliveTimeout = 120_000;

  console.log(`API listening on http://0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});

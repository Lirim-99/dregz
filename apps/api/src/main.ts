import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
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
  });

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  if (corsOrigin === '*') {
    app.enableCors({ origin: true });
  } else {
    app.enableCors({
      origin: corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    });
  }
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on http://0.0.0.0:${port}`);
}

bootstrap();

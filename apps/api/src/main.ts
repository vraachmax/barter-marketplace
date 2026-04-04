import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './prisma/prisma-exception.filter';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new PrismaClientExceptionFilter());
  const uploadsRoot = join(__dirname, '..', 'uploads');
  mkdirSync(join(uploadsRoot, 'listings'), { recursive: true });
  mkdirSync(join(uploadsRoot, 'chat-media'), { recursive: true });
  app.use('/uploads', express.static(uploadsRoot));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'x-anonymous-id'],
  });
  await app.listen(Number(process.env.PORT ?? 3001));
}
void bootstrap();

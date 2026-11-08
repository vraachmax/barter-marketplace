import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './prisma/prisma-exception.filter';
import { mkdirSync } from 'node:fs';
import express from 'express';
import { getAllowedCorsOrigins } from './config/security';
import { isAllowedCookieMutation } from './config/csrf-guard';
import { getUploadsDirectory, getUploadsRoot } from './storage/uploads-path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new PrismaClientExceptionFilter());
  const uploadsRoot = getUploadsRoot();
  mkdirSync(getUploadsDirectory('listings'), { recursive: true });
  mkdirSync(getUploadsDirectory('chat-media'), { recursive: true });
  app.use('/uploads', express.static(uploadsRoot));
  app.use(cookieParser());
  // Protect cookie-authenticated writes before parsing request bodies.
  const corsOrigins = getAllowedCorsOrigins();
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Own origin comes from configured public API URL, not attacker-supplied Host.
    const configuredApiOrigin = process.env.API_PUBLIC_ORIGIN?.trim();
    const ownOrigin = configuredApiOrigin ? new URL(configuredApiOrigin).origin : '';
    if (!isAllowedCookieMutation({
      method: req.method,
      headers: req.headers,
      cookies: req.cookies,
      allowedOrigins: corsOrigins,
      ownOrigin,
    })) {
      res.status(403).json({ statusCode: 403, message: 'csrf_origin_denied' });
      return;
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const allowedOrigins = corsOrigins;
  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
        callback(null, true);
        return;
      }
      callback(new Error('cors_origin_not_allowed'), false);
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-session-id',
      'x-anonymous-id',
    ],
  });
  await app.listen(Number(process.env.PORT ?? 3001));
}
void bootstrap();

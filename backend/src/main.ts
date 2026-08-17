import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/' + process.env.API_NAME + '/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS: อนุญาตให้ frontend (origin จาก env หรือ default ด้านล่าง) เรียก API ได้
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [
      'http://localhost:3100',
      'http://127.0.0.1:3100',
      'http://localhost:4100',
      'http://127.0.0.1:4100',
      'http://10.11.9.84:3100',
      'http://10.11.9.84:4100',
      'https://phc.dyndns.biz',
      'https://poseintelligence.co.th',
      'https://www.poseintelligence.co.th',
    ];
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'client_id', 'client_secret'],
    credentials: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();

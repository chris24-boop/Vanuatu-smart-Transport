import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.get<string>('CLIENT_ORIGIN', '*') });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(config.get<number>('PORT', 3000), '0.0.0.0');
}

void bootstrap();
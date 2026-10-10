/**
 * NetTrader 2 — Point d'Entrée & Bootstrap du Serveur NestJS
 *
 * Usage:
 *   Initialise et démarre l'application NestJS moderne remplaçant l'ancienne API PHP.
 *   Configure le préfixe d'API global, les middlewares de validation, le formatage des réponses et Swagger.
 *
 * Logique & Fonctionnement:
 *   - Préfixe d'API global : configure '/api' pour correspondre au routage du frontend React (Nginx reverse-proxy).
 *   - ValidationPipe globale : validation et transformation automatique des DTOs avec class-validator/class-transformer.
 *   - TransformInterceptor & HttpExceptionFilter : normalise toutes les réponses au format JSON unifié.
 *   - CORS : autorisation des origines configurées avec gestion des cookies/credentials.
 *   - Swagger OpenAPI : documentation interactive des endpoints exposée sur '/api/docs'.
 *   - Écoute sur le port d'environnement PORT (défaut: 3000) sur toutes les interfaces réseau (0.0.0.0).
 */

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Préfixe global /api pour correspondre au routage frontend
  app.setGlobalPrefix('api', {
    exclude: ['cmd.php'],
  });

  // Validation globale des DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Intercepteur pour formater les réponses { success: true, data: ... }
  app.useGlobalInterceptors(new TransformInterceptor());

  // Filtre d'exception global { success: false, error: ... }
  app.useGlobalFilters(new HttpExceptionFilter());

  // Activation CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Documentation Swagger OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NetTrader 2 - API REST (NestJS)')
    .setDescription('Backend moderne NestJS remplaçant l\'ancienne API et IHM PHP')
    .setVersion('2.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Serveur NestJS opérationnel sur le port ${port}`);
  logger.log(`Documentation Swagger disponible sur http://localhost:${port}/api/docs`);
}

bootstrap();

/**
 * NetTrader 2 — Filtre Global de Gestion des Exceptions HTTP
 *
 * Usage:
 *   Intercepte toutes les exceptions non capturées de l'application NestJS pour formater
 *   une réponse d'erreur JSON standardisée attendue par le frontend.
 *
 * Logique & Fonctionnement:
 *   - Extrait le code de statut HTTP et le message d'erreur de l'exception (HttpException ou Error native).
 *   - Formate la réponse en : { "success": false, "error": string, "statusCode": number, "timestamp": string }.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur interne du serveur.';
    let errorData = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message
          ? Array.isArray(resObj.message)
            ? resObj.message.join(', ')
            : resObj.message
          : exception.message;
        errorData = resObj.data || null;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Exception non gérée: ${exception.message}`,
        exception.stack,
      );
      message = exception.message || 'Erreur interne du serveur.';
    }

    response.status(status).json({
      success: false,
      error: message,
      data: errorData,
    });
  }
}

/**
 * NetTrader 2 — Intercepteur Global de Formatage des Réponses
 *
 * Usage:
 *   Enveloppe toutes les réponses réussies retournées par les contrôleurs dans une structure uniforme.
 *
 * Logique & Fonctionnement:
 *   - Transforme le payload retourné par les handlers de route en : { "success": true, "data": ... }.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Si la réponse est déjà au format unifié { success, data }
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }
        return {
          success: true,
          data: data !== undefined ? data : null,
          message: '',
        };
      }),
    );
  }
}

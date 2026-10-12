/**
 * NetTrader 2 — Service de Déclenchement des Tâches Système
 *
 * Usage:
 *   Gère l'exécution sécurisée des tâches système (synchronisation marché, exécution du carnet, vérification des scores).
 */

import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { TradingService } from '../trading/trading.service';

@Injectable()
export class AdminJobsService {
  private readonly logger = new Logger(AdminJobsService.name);

  constructor(private readonly tradingService: TradingService) {}

  /**
   * Valide la clé de sécurité d'automatisation interne (CRON_SECRET).
   */
  validateCronKey(key?: string): void {
    const expectedSecret = process.env.CRON_SECRET || 'nettrader_cron_secure_token_secret';
    if (!key) {
      throw new ForbiddenException('Accès refusé. Clé de tâche de fond requise.');
    }

    const keyBuf = Buffer.from(key);
    const expectedBuf = Buffer.from(expectedSecret);

    if (keyBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(keyBuf, expectedBuf)) {
      throw new ForbiddenException('Accès refusé. Clé de tâche de fond invalide.');
    }
  }

  /**
   * Forcer l'exécution des ordres boursiers en attente.
   */
  async executeOrdersJob(): Promise<number> {
    const executed = await this.tradingService.executePendingOrders();
    this.logger.log(`Exécution manuelle des ordres terminée (${executed} ordre(s) exécuté(s)).`);
    return executed;
  }
}

/**
 * NetTrader 2 — Contrôleur de Santé du Système (Health Check)
 *
 * Usage:
 *   Expose un endpoint de surveillance léger (/api/health) pour les sondes Docker, Kubernetes ou de monitoring externe.
 *
 * Logique & Fonctionnement:
 *   - getHealth() : retourne le statut opérationnel du serveur, l'horodatage système et l'uptime du processus.
 */

import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    let dbStatus = 'disconnected';
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
      }
    } catch {
      dbStatus = 'error';
    }

    return {
      status: 'ok',
      service: 'nettrader-nestjs-backend',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }
}

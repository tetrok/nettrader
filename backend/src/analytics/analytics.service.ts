/**
 * NetTrader 2 — Service d'Analytique & Télémétrie Intégré
 *
 * Usage:
 *   Gère la persistance des événements utilisateurs, des pratiques métier et des erreurs,
 *   ainsi que l'agrégation des KPIs pour le tableau de bord d'administration.
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual } from 'typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { AnalyticsError } from '../entities/analytics-error.entity';

export interface CollectPayload {
  sessionId: string;
  userId?: number | null;
  events?: Array<{
    eventName: string;
    category?: string;
    properties?: Record<string, any>;
    timestamp?: string;
  }>;
  errors?: Array<{
    errorType: string;
    message: string;
    route?: string;
    statusCode?: number;
    stackTrace?: string;
    context?: Record<string, any>;
  }>;
}

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly eventRepo: Repository<AnalyticsEvent>,
    @InjectRepository(AnalyticsError)
    private readonly errorRepo: Repository<AnalyticsError>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      // Création automatique et non destructive des tables si elles n'existent pas
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS \`analytics_event\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`session_id\` VARCHAR(64) NOT NULL,
          \`user_id\` INT NULL,
          \`event_name\` VARCHAR(64) NOT NULL,
          \`category\` VARCHAR(32) NOT NULL DEFAULT 'general',
          \`properties\` LONGTEXT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_analytics_event_created_at\` (\`created_at\`),
          INDEX \`idx_analytics_event_name\` (\`event_name\`),
          INDEX \`idx_analytics_event_user\` (\`user_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS \`analytics_error\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`session_id\` VARCHAR(64) NOT NULL,
          \`user_id\` INT NULL,
          \`error_type\` VARCHAR(32) NOT NULL DEFAULT 'API_ERROR',
          \`message\` TEXT NOT NULL,
          \`route\` VARCHAR(255) NULL,
          \`status_code\` INT NULL,
          \`stack_trace\` MEDIUMTEXT NULL,
          \`context\` LONGTEXT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_analytics_error_created_at\` (\`created_at\`),
          INDEX \`idx_analytics_error_type\` (\`error_type\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      this.logger.log('Tables d\'analytique initialisées avec succès.');
    } catch (err: any) {
      this.logger.error(`Erreur d'initialisation des tables d'analytique : ${err.message}`);
    }
  }

  async collect(payload: CollectPayload): Promise<{ success: boolean; recorded: number }> {
    const { sessionId, userId, events = [], errors = [] } = payload;
    let recorded = 0;

    // Insertion des événements
    if (events.length > 0) {
      const eventEntities = events.map((ev) =>
        this.eventRepo.create({
          sessionId: sessionId || 'anonymous',
          userId: userId || null,
          eventName: ev.eventName,
          category: ev.category || 'general',
          properties: ev.properties ? JSON.stringify(ev.properties) : null,
          createdAt: ev.timestamp ? new Date(ev.timestamp) : new Date(),
        }),
      );
      await this.eventRepo.save(eventEntities);
      recorded += eventEntities.length;
    }

    // Insertion des erreurs
    if (errors.length > 0) {
      const errorEntities = errors.map((err) =>
        this.errorRepo.create({
          sessionId: sessionId || 'anonymous',
          userId: userId || null,
          errorType: err.errorType || 'API_ERROR',
          message: err.message || 'Erreur non spécifiée',
          route: err.route || null,
          statusCode: err.statusCode || null,
          stackTrace: err.stackTrace || null,
          context: err.context ? JSON.stringify(err.context) : null,
          createdAt: new Date(),
        }),
      );
      await this.errorRepo.save(errorEntities);
      recorded += errorEntities.length;
    }

    return { success: true, recorded };
  }

  async getOverview(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 1. KPIs Usages Globaux
    const totalEvents = await this.eventRepo.count({
      where: { createdAt: MoreThanOrEqual(cutoffDate) },
    });

    const uniqueSessionsRaw = await this.eventRepo
      .createQueryBuilder('e')
      .select('COUNT(DISTINCT e.session_id)', 'count')
      .where('e.created_at >= :cutoff', { cutoff: cutoffDate })
      .getRawOne();
    const uniqueSessions = Number(uniqueSessionsRaw?.count || 0);

    const activeUsersRaw = await this.eventRepo
      .createQueryBuilder('e')
      .select('COUNT(DISTINCT e.user_id)', 'count')
      .where('e.created_at >= :cutoff AND e.user_id IS NOT NULL', { cutoff: cutoffDate })
      .getRawOne();
    const activeUsers = Number(activeUsersRaw?.count || 0);

    // Pages les plus visitées
    const topPages = await this.eventRepo
      .createQueryBuilder('e')
      .select("JSON_UNQUOTE(JSON_EXTRACT(e.properties, '$.path'))", 'path')
      .addSelect('COUNT(*)', 'views')
      .where("e.event_name = 'page_view' AND e.created_at >= :cutoff", { cutoff: cutoffDate })
      .groupBy('path')
      .orderBy('views', 'DESC')
      .limit(8)
      .getRawMany();

    // 2. Pratiques de Trading
    const tradingEvents = await this.eventRepo
      .createQueryBuilder('e')
      .select('e.event_name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where("e.event_name IN ('trade_modal_opened', 'order_submitted', 'order_placed_success', 'order_placed_failed', 'order_validation_blocked') AND e.created_at >= :cutoff", { cutoff: cutoffDate })
      .groupBy('e.event_name')
      .getRawMany();

    const tradingSummary = {
      modalOpened: 0,
      submitted: 0,
      success: 0,
      failed: 0,
      blocked: 0,
    };
    tradingEvents.forEach((t) => {
      if (t.name === 'trade_modal_opened') tradingSummary.modalOpened = Number(t.count);
      if (t.name === 'order_submitted') tradingSummary.submitted = Number(t.count);
      if (t.name === 'order_placed_success') tradingSummary.success = Number(t.count);
      if (t.name === 'order_placed_failed') tradingSummary.failed = Number(t.count);
      if (t.name === 'order_validation_blocked') tradingSummary.blocked = Number(t.count);
    });

    // Types d'ordres (Achat vs Vente)
    const sensBreakdown = await this.eventRepo
      .createQueryBuilder('e')
      .select("JSON_UNQUOTE(JSON_EXTRACT(e.properties, '$.sens'))", 'sens')
      .addSelect('COUNT(*)', 'count')
      .where("e.event_name = 'order_submitted' AND e.created_at >= :cutoff", { cutoff: cutoffDate })
      .groupBy('sens')
      .getRawMany();

    // 3. Problèmes & Erreurs
    const totalErrors = await this.errorRepo.count({
      where: { createdAt: MoreThanOrEqual(cutoffDate) },
    });

    const errorTypes = await this.errorRepo
      .createQueryBuilder('err')
      .select('err.error_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('err.created_at >= :cutoff', { cutoff: cutoffDate })
      .groupBy('err.error_type')
      .orderBy('count', 'DESC')
      .getRawMany();

    const recentErrors = await this.errorRepo.find({
      where: { createdAt: MoreThanOrEqual(cutoffDate) },
      order: { createdAt: 'DESC' },
      take: 25,
    });

    return {
      periodDays: days,
      kpis: {
        totalEvents,
        uniqueSessions,
        activeUsers,
        totalErrors,
      },
      usages: {
        topPages: topPages.map((p) => ({
          path: p.path || '/',
          views: Number(p.views),
        })),
      },
      trading: {
        summary: tradingSummary,
        sens: sensBreakdown.map((s) => ({
          sens: s.sens || 'inconnu',
          count: Number(s.count),
        })),
      },
      errors: {
        total: totalErrors,
        breakdown: errorTypes.map((t) => ({
          type: t.type,
          count: Number(t.count),
        })),
        recent: recentErrors.map((e) => ({
          id: e.id,
          type: e.errorType,
          message: e.message,
          route: e.route,
          statusCode: e.statusCode,
          stackTrace: e.stackTrace,
          context: e.context ? JSON.parse(e.context) : null,
          createdAt: e.createdAt,
          userId: e.userId,
        })),
      },
    };
  }
}

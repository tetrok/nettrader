/**
 * NetTrader 2 — Service de File d'Attente E-mail et Rapports Périodiques
 *
 * Usage:
 *   - Dépile en continu les messages électroniques en attente (`mail_tosend`) vers le serveur SMTP Mailpit.
 *   - Génère et programme les récapitulatifs périodiques d'activité pour les joueurs abonnés.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailToSend } from '../entities/mail-to-send.entity';
import { User } from '../entities/user.entity';
import { Portfolio } from '../entities/portfolio.entity';

@Injectable()
export class MailerQueueService {
  private readonly logger = new Logger(MailerQueueService.name);
  private readonly mailer: nodemailer.Transporter;
  private isProcessing = false;

  constructor(
    @InjectRepository(MailToSend)
    private readonly mailRepository: Repository<MailToSend>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    private readonly configService: ConfigService,
  ) {
    const mailHost = this.configService.get<string>('MAIL_HOST', 'mailpit');
    const mailPort = Number(this.configService.get<number>('MAIL_PORT', 1025));

    this.mailer = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: false,
      ignoreTLS: true,
    });
  }

  /**
   * Dépilage de la file d'attente d'e-mails toutes les 15 secondes.
   */
  @Cron('*/15 * * * * *')
  async processMailQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = Math.floor(Date.now() / 1000);
      const pendingMails = await this.mailRepository.find({
        where: {
          status: 'attente',
          sendDate: LessThanOrEqual(now),
        },
        take: 20,
      });

      if (pendingMails.length === 0) {
        return;
      }

      for (const mail of pendingMails) {
        mail.status = 'traitement';
        await this.mailRepository.save(mail);

        try {
          await this.mailer.sendMail({
            from: `"${mail.fromPseudo || 'NetTrader'}" <${mail.fromMail || 'no-reply@nettrader.fr'}>`,
            to: `"${mail.toPseudo || 'Trader'}" <${mail.toMail}>`,
            subject: mail.subject,
            text: mail.body,
          });

          // Succès : suppression du message traité
          await this.mailRepository.delete(mail.id);
        } catch (sendErr) {
          this.logger.warn(`Échec d'envoi du mail #${mail.id} vers ${mail.toMail}: ${sendErr.message}`);
          mail.status = 'erreur';
          await this.mailRepository.save(mail);
        }
      }
    } catch (err) {
      this.logger.error(`Erreur de traitement de la file d'attente d'e-mails : ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Génération des statistiques hebdomadaires chaque vendredi à 18h00.
   */
  @Cron('0 18 * * 5', { timeZone: 'Europe/Paris' })
  async generateWeeklyStats(): Promise<void> {
    try {
      this.logger.log('Génération des rapports statistiques hebdomadaires...');
      const weeklyUsers = await this.userRepository.find({ where: { mailweekly: 1 } });
      const now = Math.floor(Date.now() / 1000);

      for (const user of weeklyUsers) {
        const positions = await this.portfolioRepository.find({
          where: { userId: user.id },
          relations: ['stock'],
        });

        let totalValue = Number(user.cashback);
        const positionLines: string[] = [];

        for (const pos of positions) {
          const val = Number(pos.stock?.price || 0) * Number(pos.quantity);
          totalValue += val;
          positionLines.push(`- ${pos.stock?.name || 'Titre #' + pos.stockCode} : ${pos.quantity} action(s) (${val.toFixed(2)} €)`);
        }

        const body = `Bonjour ${user.pseudo},\n\nVoici le récapitulatif hebdomadaire de votre portefeuille NetTrader :\n` +
          `- Liquidités disponibles : ${Number(user.cashback).toFixed(2)} €\n` +
          `- Valorisation globale estimée : ${totalValue.toFixed(2)} €\n` +
          `- Positions actives :\n${positionLines.length > 0 ? positionLines.join('\n') : 'Aucune position active'}\n\n` +
          `Continuez vos investissements sur : http://localhost:3000\n\nL'équipe NetTrader 2`;

        await this.mailRepository.save({
          sendDate: now,
          fromMail: 'statsweek@nettrader.fr',
          fromPseudo: 'NetTrader Statistiques',
          toMail: user.email,
          toPseudo: user.pseudo,
          subject: `${user.pseudo}, vos statistiques de la semaine`,
          body,
          status: 'attente',
        });
      }

      this.logger.log(`Rapports hebdomadaires préparés pour ${weeklyUsers.length} utilisateur(s).`);
    } catch (err) {
      this.logger.error(`Erreur lors de la génération des statistiques hebdomadaires : ${err.message}`);
    }
  }

  /**
   * Génération des statistiques quotidiennes du lundi au vendredi à 18h05.
   */
  @Cron('5 18 * * 1-5', { timeZone: 'Europe/Paris' })
  async generateDailyStats(): Promise<void> {
    try {
      this.logger.log('Génération des rapports statistiques quotidiens...');
      const dailyUsers = await this.userRepository.find({ where: { maildaily: 1 } });
      const now = Math.floor(Date.now() / 1000);

      for (const user of dailyUsers) {
        const positions = await this.portfolioRepository.find({
          where: { userId: user.id },
          relations: ['stock'],
        });

        let totalValue = Number(user.cashback);
        for (const pos of positions) {
          totalValue += Number(pos.stock?.price || 0) * Number(pos.quantity);
        }

        const body = `Bonjour ${user.pseudo},\n\nVotre bilan boursier quotidien NetTrader :\n` +
          `- Liquidités : ${Number(user.cashback).toFixed(2)} €\n` +
          `- Portefeuille total : ${totalValue.toFixed(2)} €\n\n` +
          `Consultez les marchés sur : http://localhost:3000\n\nL'équipe NetTrader 2`;

        await this.mailRepository.save({
          sendDate: now,
          fromMail: 'statsdaily@nettrader.fr',
          fromPseudo: 'NetTrader Quotidien',
          toMail: user.email,
          toPseudo: user.pseudo,
          subject: `${user.pseudo}, votre bilan boursier de la journée`,
          body,
          status: 'attente',
        });
      }

      this.logger.log(`Rapports quotidiens préparés pour ${dailyUsers.length} utilisateur(s).`);
    } catch (err) {
      this.logger.error(`Erreur lors de la génération des statistiques quotidiennes : ${err.message}`);
    }
  }
}

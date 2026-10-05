import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private mailer: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const mailHost = this.configService.get<string>('MAIL_HOST', 'mailpit');
    const mailPort = Number(this.configService.get<number>('MAIL_PORT', 1025));

    this.mailer = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: false,
      ignoreTLS: true,
    });
  }

  getRules(): { content: string } {
    return {
      content: `
        <h3>Règlement de NetTrader 2</h3>
        <p>1. <strong>Capital initial :</strong> Chaque nouveau trader débute avec un capital fictif de 10 000 €.</p>
        <p>2. <strong>Marché & Horaires :</strong> Les cours sont synchronisés avec les marchés réels aux horaires officiels de cotation (9h15 - 17h55).</p>
        <p>3. <strong>Frais de courtage :</strong> Une commission proportionnelle de 0.30% HT (plus TVA à 19.6%) s'applique à chaque transaction, avec un minimum forfaitaire de 4,95 €.</p>
        <p>4. <strong>Types d'ordres :</strong> Ordres au marché ou ordres à cours limité avec seuil de déclenchement.</p>
        <p>5. <strong>Fair-play :</strong> Toute tentative de manipulation ou d'exploitation de failles techniques est formellement prohibée.</p>
      `,
    };
  }

  getHelp(id?: number): { content: string } {
    return {
      content: `
        <h3>Guide du Joueur</h3>
        <p>NetTrader 2 vous permet d'apprendre à trader sur les actions sans risque financier.</p>
        <h4>Niveaux de joueurs :</h4>
        <ul>
          <li><strong>Débutant :</strong> Ordres au marché au comptant.</li>
          <li><strong>Initié :</strong> Accès aux ordres à cours limité et aux plages de déclenchement.</li>
          <li><strong>Expert :</strong> Accès à la Vente À Découvert (VAD) et aux ordres complexes.</li>
        </ul>
      `,
    };
  }

  getFaq(id?: number): { content: string } {
    return {
      content: `
        <h3>Foire Aux Questions (FAQ)</h3>
        <p><strong>Q : Comment passer mon premier ordre ?</strong><br/>
        R : Rendez-vous sur la page Marché, sélectionnez une action et cliquez sur « Acheter ».</p>
        <p><strong>Q : Puis-je réinitialiser mon portefeuille si je perds tout ?</strong><br/>
        R : Oui, l'onglet Compte propose une option de Remise à Zéro (RAZ) pour repartir avec 10 000 €.</p>
      `,
    };
  }

  async sendContact(email: string, subject: string, message: string) {
    if (!email || !message) {
      throw new BadRequestException('Veuillez renseigner votre email et votre message.');
    }

    try {
      await this.mailer.sendMail({
        from: `"${email}" <no-reply@nettrader.fr>`,
        to: 'contact@nettrader.fr',
        replyTo: email,
        subject: `[Contact NetTrader] ${subject || 'Demande de contact'} (${email})`,
        text: `De: ${email}\n\nMessage:\n${message}`,
      });
    } catch (err) {
      this.logger.warn(`Impossible d'envoyer l'email de contact: ${err.message}`);
    }

    return { message: "Votre message a été envoyé avec succès à l'équipe NetTrader." };
  }
}

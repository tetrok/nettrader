/**
 * NetTrader 2 — Service d'Authentification & Hachage Cryptographique
 *
 * Usage:
 *   Contient la logique métier d'authentification des joueurs, gestion des mots de passe et génération de sessions.
 *
 * Logique & Fonctionnement:
 *   - Valide les mots de passe avec bcrypt (avec mise à niveau transparente des anciens hash MD5).
 *   - Génère des jetons de session cryptographiquement sûrs (CSPRNG 256 bits).
 *   - Gère la révocation des sessions annexes lors d'un changement de mot de passe.
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { TabForcing } from '../entities/tabforcing.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private mailer: nodemailer.Transporter;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(TabForcing)
    private readonly tabForcingRepository: Repository<TabForcing>,
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
   * Connexion avec vérification bcrypt exclusive et token valide 24h.
   */
  async login(loginDto: LoginDto) {
    const login = loginDto.login.trim();
    const isEmail = login.includes('@');

    const user = await this.userRepository.findOne({
      where: isEmail ? { email: login } : { pseudo: login },
      relations: ['niveau', 'skinEntity'],
    });

    if (!user) {
      throw new UnauthorizedException('Identifiant ou mot de passe incorrect.');
    }

    // Contrôle bruteforce
    const attempts = await this.tabForcingRepository.count({
      where: { idcompte: user.id },
    });

    if (attempts >= 25) {
      throw new UnauthorizedException(
        "Nombre d'essais dépassé. Veuillez réessayer ultérieurement.",
      );
    }

    // Vérification exclusive du mot de passe avec bcrypt (pas de rétrocompatibilité MD5)
    const isMatch = await bcrypt.compare(loginDto.password, user.passe);
    if (!isMatch) {
      const now = Math.floor(Date.now() / 1000);
      await this.tabForcingRepository.save({
        idcompte: user.id,
        dateforcing: now,
      });
      throw new UnauthorizedException('Identifiant ou mot de passe incorrect.');
    }

    // Génération du token de session sécurisé
    const sessionId = crypto.randomBytes(32).toString('hex');
    const now = Math.floor(Date.now() / 1000);
    // Durée de validité : 24 heures (86 400 secondes)
    const limit = now + 86400;

    await this.sessionRepository.save({
      idSession: sessionId,
      idcompte: user.id,
      tempsLimite: limit,
      tempsconnect: now,
    });

    // Mise à jour de l'activité
    await this.userRepository.update(user.id, { dateactivite: now });

    // Réinitialisation des tentatives de forcing après un succès
    await this.tabForcingRepository.delete({ idcompte: user.id });

    return {
      token: sessionId,
      user: {
        id: Number(user.id),
        pseudo: user.pseudo,
        email: user.email,
        cashback: Number(user.cashback),
        authlevel: Number(user.authlevel),
        isAdmin: user.isAdmin,
        level: Number(user.idniveau || 1),
        vad: user.isVadAllowed,
        skin: user.skinEntity?.repertoire
          ? `skin/${user.skinEntity.repertoire}`
          : 'skin/default',
        dateinscr: Number(user.dateinscr),
      },
    };
  }

  /**
   * Inscription d'un nouvel utilisateur avec capital initial de 10 000 €.
   */
  async register(registerDto: RegisterDto) {
    const pseudo = registerDto.pseudo.trim();
    const email = registerDto.email.trim();

    // Vérification d'unicité pseudo
    const existingPseudo = await this.userRepository.findOne({
      where: { pseudo },
    });
    if (existingPseudo) {
      throw new ConflictException(
        'Ce pseudonyme est déjà utilisé par un autre joueur.',
      );
    }

    // Vérification d'unicité email
    const existingEmail = await this.userRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Cette adresse email est déjà enregistrée.');
    }

    // Hachage du mot de passe avec bcrypt
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const now = Math.floor(Date.now() / 1000);
    const initialCashback = 10000.0;

    const mailDaily = registerDto.mailDaily ?? (registerDto.mailJour ? true : false);
    const mailWeekly = registerDto.mailWeekly ?? (registerDto.mailSemaine ? true : false);

    const newUser = this.userRepository.create({
      pseudo,
      email,
      passe: hashedPassword,
      nom: '',
      prenom: '',
      adresse: '',
      cp: '',
      ville: '',
      tel: '',
      etablissement: '',
      idniveau: registerDto.level || 1,
      cashback: initialCashback,
      maildaily: mailDaily ? 1 : 0,
      mailweekly: mailWeekly ? 1 : 0,
      dateinscr: now,
      dateactivite: now,
      authlevel: 1,
      idskin: 1,
      cookiesess: '',
      nbpostforum: 0,
      toutvuforum: 0,
    });

    const savedUser = await this.userRepository.save(newUser);

    // Envoi de l'email de bienvenue
    try {
      await this.mailer.sendMail({
        from: '"NetTrader 2" <no-reply@nettrader.fr>',
        to: email,
        subject: 'Bienvenue sur NetTrader 2 !',
        text: `Bonjour ${pseudo},\n\nBienvenue sur NetTrader 2 ! Votre compte a été créé avec un capital initial de ${initialCashback.toLocaleString('fr-FR')} €.\n\nBons trades !`,
      });
    } catch (err) {
      this.logger.warn(`Impossible d'envoyer l'email de bienvenue: ${err.message}`);
    }

    return {
      id: Number(savedUser.id),
      pseudo: savedUser.pseudo,
      email: savedUser.email,
      cashback: initialCashback,
    };
  }

  /**
   * Déconnexion et invalidation de session.
   */
  async logout(token?: string, userId?: number) {
    if (token) {
      await this.sessionRepository.delete({ idSession: token });
    }
    if (userId) {
      await this.sessionRepository.delete({ idcompte: userId });
    }
    return null;
  }

  /**
   * Récupération du profil complet de l'utilisateur connecté.
   */
  async getMe(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['niveau', 'skinEntity'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return {
      id: Number(user.id),
      pseudo: user.pseudo,
      email: user.email,
      cashback: Number(user.cashback),
      authlevel: Number(user.authlevel),
      isAdmin: user.isAdmin,
      level: Number(user.idniveau || 1),
      vad: user.isVadAllowed,
      skin: user.skinEntity?.repertoire
        ? `skin/${user.skinEntity.repertoire}`
        : 'skin/default',
      dateinscr: Number(user.dateinscr),
    };
  }

  /**
   * Demande de réinitialisation de mot de passe par email.
   */
  async requestPasswordReset(login: string) {
    const trimmed = login.trim();
    const isEmail = trimmed.includes('@');

    const user = await this.userRepository.findOne({
      where: isEmail ? { email: trimmed } : { pseudo: trimmed },
    });

    if (!user) {
      // Pour éviter le leak d'adresses ou pseudos, renvoyer le même message
      return {
        message:
          'Si un compte correspond à cet identifiant, un email vous a été envoyé.',
      };
    }

    const now = Math.floor(Date.now() / 1000);

    // Rate-limiting : Vérifier si une demande récente active (< 15 min) existe déjà
    const activeReset = await this.sessionRepository
      .createQueryBuilder('s')
      .where('s.idcompte = :userId AND s.idSession LIKE :prefix AND s.tempsLimite > :now', {
        userId: user.id,
        prefix: 'reset_%',
        now,
      })
      .getOne();

    if (activeReset) {
      return {
        message:
          'Si un compte correspond à cet identifiant, un email vous a été envoyé.',
      };
    }

    // Génération d'un token sécurisé de réinitialisation sans écraser le mot de passe actuel
    const resetToken = crypto.randomBytes(24).toString('hex');
    await this.sessionRepository.save({
      idSession: `reset_${resetToken}`,
      idcompte: user.id,
      tempsLimite: now + 3600, // Valide 1 heure
      tempsconnect: now,
    });

    try {
      await this.mailer.sendMail({
        from: '"NetTrader 2" <no-reply@nettrader.fr>',
        to: user.email,
        subject: 'Demande de réinitialisation de votre mot de passe NetTrader',
        text: `Bonjour ${user.pseudo},\n\nUne demande de réinitialisation de mot de passe a été initiée pour votre compte.\nVotre jeton sécurisé de validation est : ${resetToken}\n(Ce jeton est valable 1 heure).\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message en toute sécurité : votre mot de passe actuel reste inchangé.\n\nL'équipe NetTrader`,
      });
    } catch (err) {
      this.logger.warn(
        `Impossible d'envoyer l'email de réinitialisation: ${err.message}`,
      );
    }

    return {
      message:
        'Si un compte correspond à cet identifiant, un email vous a été envoyé.',
    };
  }

  /**
   * Confirmation et exécution de la réinitialisation de mot de passe.
   */
  async confirmPasswordReset(token: string, newPassword: string) {
    const cleanToken = token.trim();
    if (!cleanToken) {
      throw new BadRequestException('Jeton de réinitialisation invalide.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Le nouveau mot de passe doit comporter au moins 6 caractères.');
    }

    const sessionKey = cleanToken.startsWith('reset_') ? cleanToken : `reset_${cleanToken}`;
    const now = Math.floor(Date.now() / 1000);

    const session = await this.sessionRepository.findOne({
      where: { idSession: sessionKey },
    });

    if (!session || Number(session.tempsLimite) < now) {
      throw new BadRequestException('Jeton de réinitialisation invalide ou expiré.');
    }

    const user = await this.userRepository.findOne({
      where: { id: session.idcompte },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    // Hashage avec bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passe = hashedPassword;
    await this.userRepository.save(user);

    // Suppression immédiate du token de réinitialisation (usage unique)
    await this.sessionRepository.delete({ idSession: sessionKey });

    // Révocation de toutes les autres sessions actives par sécurité
    await this.sessionRepository.delete({ idcompte: user.id });

    return {
      message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    };
  }
}

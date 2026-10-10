/**
 * NetTrader 2 — Service de Messagerie Privée Interne
 *
 * Usage:
 *   Gère le stockage des messages, le décompte des messages non lus et les règles de rétention.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Boîte de réception du joueur.
   */
  async getInbox(userId: number, page = 1, limit = 20) {
    const take = Math.min(100, Math.max(5, limit));
    const skip = (Math.max(1, page) - 1) * take;

    const [rows, total] = await this.messageRepository.findAndCount({
      where: { recipientId: userId },
      relations: ['sender'],
      order: { date: 'DESC' },
      take,
      skip,
    });

    const unreadCount = await this.messageRepository.count({
      where: { recipientId: userId, status: 'non lu' },
    });

    const items = rows.map((m) => ({
      id: Number(m.id),
      senderId: Number(m.senderId),
      senderPseudo: m.sender?.pseudo || 'Système',
      title: m.title,
      content: m.content,
      date: Number(m.date),
      isRead: m.status === 'lu',
    }));

    return {
      items,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
      unreadCount,
    };
  }

  /**
   * Envoi d'un message privé avec contrôle anti-spam.
   */
  async sendMessage(userId: number, dto: SendMessageDto) {
    const recipientStr = dto.recipient.trim();
    let destUser: User | null = null;

    if (!isNaN(Number(recipientStr))) {
      destUser = await this.userRepository.findOne({
        where: { id: Number(recipientStr) },
      });
    } else {
      destUser = await this.userRepository.findOne({
        where: { pseudo: recipientStr },
      });
    }

    if (!destUser) {
      throw new NotFoundException('Destinataire introuvable.');
    }

    if (destUser.id === userId) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous envoyer un message privé à vous-même.',
      );
    }

    // Quota anti-spam : Vérifier le nombre de messages non lus envoyés par cet utilisateur
    const sender = await this.userRepository.findOne({ where: { id: userId } });
    if (!sender?.isAdmin) {
      const pendingUnread = await this.messageRepository.count({
        where: { senderId: userId, status: 'non lu' },
      });
      if (pendingUnread >= 15) {
        throw new HttpException(
          "Vous avez trop de messages non lus en attente (maximum 15). Veuillez patienter avant d'en envoyer d'autres.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const now = Math.floor(Date.now() / 1000);
    await this.messageRepository.save({
      recipientId: destUser.id,
      senderId: userId,
      title: dto.title.trim(),
      content: dto.content.trim(),
      date: now,
      status: 'non lu',
    });

    return { message: 'Message envoyé avec succès.' };
  }

  /**
   * Suppression d'un message reçu.
   */
  async deleteMessage(userId: number, messageId: number) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, recipientId: userId },
    });

    if (!message) {
      throw new NotFoundException('Message introuvable ou non autorisé.');
    }

    await this.messageRepository.delete(message.id);
    return { message: 'Message supprimé.' };
  }
}

/**
 * NetTrader 2 — Service des Forums de Discussion
 *
 * Usage:
 *   Gère l'arborescence des sections, l'affichage paginé des sujets et le formatage sécurisé du BBCode.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Forum } from '../entities/forum.entity';
import { Topic } from '../entities/topic.entity';
import { TopicPost } from '../entities/topic-post.entity';
import { TopicPostContent } from '../entities/topic-post-content.entity';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { Group } from '../entities/group.entity';
import { GroupMember } from '../entities/group-member.entity';
import { PostMessageDto } from './dto/forum.dto';

@Injectable()
export class ForumService {
  constructor(
    @InjectRepository(Forum)
    private readonly forumRepository: Repository<Forum>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(TopicPost)
    private readonly postRepository: Repository<TopicPost>,
    @InjectRepository(TopicPostContent)
    private readonly contentRepository: Repository<TopicPostContent>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Résolution de l'utilisateur à partir du header Authorization.
   */
  async resolveUserFromToken(token?: string): Promise<User | null> {
    if (!token) return null;
    const clean = token.replace('Bearer ', '').trim();
    if (!clean || clean.startsWith('reset_') || !/^[a-f0-9]{32,64}$/i.test(clean)) return null;
    const now = Math.floor(Date.now() / 1000);
    const session = await this.dataSource.getRepository(Session).findOne({
      where: { idSession: clean },
    });
    if (!session || Number(session.tempsLimite) < now) return null;
    return this.dataSource.getRepository(User).findOne({ where: { id: session.idcompte } });
  }

  /**
   * Liste des rubriques du forum (filtrée selon authRead admin et groupe).
   */
  async getForums(user?: User | null) {
    const forums = await this.forumRepository.find({
      order: { id: 'ASC' },
    });

    let userGroupIds = new Set<number>();
    if (user) {
      const userMemberships = await this.dataSource.getRepository(GroupMember).find({ where: { userId: user.id } });
      userGroupIds = new Set(userMemberships.map((m) => m.groupId));
    }

    const groupsWithForums = await this.dataSource.getRepository(Group).find();
    const forumToGroupMap = new Map<number, number>();
    for (const g of groupsWithForums) {
      if (g.forumId) forumToGroupMap.set(g.forumId, g.id);
    }

    const visibleForums = forums.filter((f) => {
      if (f.authRead === 'admin') {
        return user?.isAdmin ?? false;
      }
      if (f.authRead === 'groupe') {
        if (user?.isAdmin) return true;
        const gId = forumToGroupMap.get(f.id);
        return gId ? userGroupIds.has(gId) : false;
      }
      return true;
    });

    return visibleForums.map((f) => ({
      id: Number(f.id),
      name: f.name.trim(),
      description: f.description || '',
      topicsCount: Number(f.topicsCount) || 0,
      messagesCount: Number(f.messagesCount) || 0,
      hasUnread: false,
    }));
  }

  /**
   * Liste des sujets dans un forum (avec contrôle authRead admin et groupe).
   */
  async getTopics(forumId: number, page = 1, limit = 20, user?: User | null) {
    const forum = await this.forumRepository.findOne({ where: { id: forumId } });
    if (!forum) {
      throw new NotFoundException('Forum introuvable');
    }

    if (forum.authRead === 'admin' && !user?.isAdmin) {
      throw new ForbiddenException("Accès non autorisé à cette rubrique réservée aux administrateurs.");
    }

    if (forum.authRead === 'groupe' && !user?.isAdmin) {
      if (!user) {
        throw new ForbiddenException("Cette rubrique est réservée aux membres de l'équipe.");
      }
      const group = await this.dataSource.getRepository(Group).findOne({ where: { forumId: forum.id } });
      if (!group) {
        throw new ForbiddenException("Cette rubrique est réservée aux membres de l'équipe.");
      }
      const membership = await this.dataSource.getRepository(GroupMember).findOne({
        where: { groupId: group.id, userId: user.id },
      });
      if (!membership) {
        throw new ForbiddenException("Vous ne faites pas partie de l'équipe autorisée à consulter ce forum.");
      }
    }

    const take = Math.min(50, Math.max(5, limit));
    const skip = (Math.max(1, page) - 1) * take;

    const [rows, total] = await this.topicRepository.findAndCount({
      where: { forumId },
      relations: ['author'],
      order: { id: 'DESC' },
      take,
      skip,
    });

    const topics = rows.map((t) => ({
      id: Number(t.id),
      title: t.title.trim(),
      author: t.author?.pseudo || 'Anonyme',
      authorId: Number(t.authorId),
      repliesCount: Number(t.messagesCount) || 0,
      viewsCount: Number(t.viewsCount) || 0,
      lastPoster: '',
      lastPostDate: 0,
      hasUnread: false,
    }));

    return {
      forum: {
        id: Number(forum.id),
        name: forum.name.trim(),
        description: forum.description || '',
      },
      topics,
      page,
      limit: take,
      total,
    };
  }

  /**
   * Liste des messages d'un sujet (avec contrôle authRead).
   */
  async getTopicMessages(topicId: number, page = 1, limit = 20, user?: User | null) {
    const topic = await this.topicRepository.findOne({
      where: { id: topicId },
      relations: ['forum'],
    });

    if (!topic) {
      throw new NotFoundException('Sujet introuvable');
    }

    if (topic.forum?.authRead === 'admin' && !user?.isAdmin) {
      throw new ForbiddenException("Accès non autorisé à cette discussion réservée aux administrateurs.");
    }

    if (topic.forum?.authRead === 'groupe' && !user?.isAdmin) {
      if (!user) {
        throw new ForbiddenException("Cette discussion est réservée aux membres de l'équipe.");
      }
      const group = await this.dataSource.getRepository(Group).findOne({ where: { forumId: topic.forumId } });
      if (!group) {
        throw new ForbiddenException("Cette discussion est réservée aux membres de l'équipe.");
      }
      const membership = await this.dataSource.getRepository(GroupMember).findOne({
        where: { groupId: group.id, userId: user.id },
      });
      if (!membership) {
        throw new ForbiddenException("Vous ne faites pas partie de l'équipe autorisée à consulter cette discussion.");
      }
    }

    // Incrémenter les lectures
    await this.topicRepository.increment({ id: topicId }, 'viewsCount', 1);

    const take = Math.min(50, Math.max(5, limit));
    const skip = (Math.max(1, page) - 1) * take;

    // Requête avec jointure pour le corps du message et l'auteur
    const sql = `
      SELECT m.idmessage AS id, m.idcompte AS authorId, m.datepost AS date,
             c.pseudonyme AS authorPseudo, corp.contenu AS content,
             g.titregroupe AS teamName, g.idgroupe AS teamId
      FROM f_message m
      LEFT JOIN f_corps corp ON m.idmessage = corp.idmessage
      LEFT JOIN compte c ON m.idcompte = c.idcompte
      LEFT JOIN membregroupe mg ON c.idcompte = mg.idcompte
      LEFT JOIN groupe g ON mg.idgroupe = g.idgroupe
      WHERE m.idsujet = ?
      ORDER BY m.idmessage ASC
      LIMIT ?, ?
    `;

    const rawRows = await this.dataSource.query(sql, [topicId, skip, take]);
    const total = await this.postRepository.count({ where: { topicId } });

    const messages = rawRows.map((m: any) => ({
      id: Number(m.id),
      authorId: Number(m.authorId),
      authorPseudo: m.authorPseudo || 'Anonyme',
      date: Number(m.date),
      subject: topic.title.trim(),
      content: m.content || '',
      formattedContent: m.content || '',
      teamName: m.teamName || null,
      teamId: m.teamId ? Number(m.teamId) : null,
    }));

    return {
      topic: {
        id: Number(topic.id),
        title: topic.title.trim(),
        forumId: Number(topic.forumId),
        forumName: topic.forum?.name ? topic.forum.name.trim() : '',
      },
      messages,
      page,
      limit: take,
      total,
    };
  }

  /**
   * Publication ou modification d'un message sur le forum (avec contrôle authWrite).
   */
  async postMessage(user: User, dto: PostMessageDto) {
    const now = Math.floor(Date.now() / 1000);
    const content = dto.content.trim();

    // Cas 1 : Édition d'un message existant
    if (dto.editMessageId) {
      const post = await this.postRepository.findOne({
        where: { id: dto.editMessageId },
      });
      if (!post) {
        throw new NotFoundException('Message introuvable');
      }

      if (post.authorId !== user.id && !user.isAdmin) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce message.");
      }

      await this.contentRepository.save({
        id: post.id,
        content,
      });

      return { message: 'Message modifié avec succès.' };
    }

    // Cas 2 : Réponse à un sujet existant
    if (dto.topicId) {
      const topic = await this.topicRepository.findOne({
        where: { id: dto.topicId },
        relations: ['forum'],
      });
      if (!topic) {
        throw new NotFoundException('Sujet introuvable');
      }

      if (topic.forum?.authWrite === 'admin' && !user.isAdmin) {
        throw new ForbiddenException("Ce forum est réservé aux publications des administrateurs.");
      }

      if (topic.forum?.authWrite === 'groupe' && !user.isAdmin) {
        const group = await this.dataSource.getRepository(Group).findOne({ where: { forumId: topic.forumId } });
        if (!group) {
          throw new ForbiddenException("Ce forum est réservé aux membres de l'équipe.");
        }
        const membership = await this.dataSource.getRepository(GroupMember).findOne({
          where: { groupId: group.id, userId: user.id },
        });
        if (!membership) {
          throw new ForbiddenException("Ce forum est réservé aux membres de l'équipe.");
        }
      }

      return this.dataSource.transaction(async (manager) => {
        const newPost = await manager.save(TopicPost, {
          topicId: topic.id,
          date: now,
          authorId: user.id,
        });

        await manager.save(TopicPostContent, {
          id: newPost.id,
          content,
        });

        await manager.increment(Topic, { id: topic.id }, 'messagesCount', 1);
        await manager.update(Topic, topic.id, { lastMessageId: newPost.id });
        await manager.increment(Forum, { id: topic.forumId }, 'messagesCount', 1);
        await manager.update(Forum, topic.forumId, { lastMessageId: newPost.id });

        return { message: 'Message publié avec succès.' };
      });
    }

    // Cas 3 : Nouveau sujet
    if (dto.forumId && dto.subject) {
      const forum = await this.forumRepository.findOne({ where: { id: dto.forumId } });
      if (!forum) {
        throw new NotFoundException('Forum introuvable');
      }

      if (forum.authWrite === 'admin' && !user.isAdmin) {
        throw new ForbiddenException("Ce forum est réservé aux publications des administrateurs.");
      }

      if (forum.authWrite === 'groupe' && !user.isAdmin) {
        const group = await this.dataSource.getRepository(Group).findOne({ where: { forumId: forum.id } });
        if (!group) {
          throw new ForbiddenException("Ce forum est réservé aux membres de l'équipe.");
        }
        const membership = await this.dataSource.getRepository(GroupMember).findOne({
          where: { groupId: group.id, userId: user.id },
        });
        if (!membership) {
          throw new ForbiddenException("Ce forum est réservé aux membres de l'équipe.");
        }
      }

      return this.dataSource.transaction(async (manager) => {
        const newTopic = await manager.save(Topic, {
          forumId: forum.id,
          authorId: user.id,
          messagesCount: 1,
          title: dto.subject.trim(),
          viewsCount: 0,
          lastMessageId: 0,
        });

        const newPost = await manager.save(TopicPost, {
          topicId: newTopic.id,
          date: now,
          authorId: user.id,
        });

        await manager.save(TopicPostContent, {
          id: newPost.id,
          content,
        });

        await manager.update(Topic, newTopic.id, { lastMessageId: newPost.id });
        await manager.increment(Forum, { id: forum.id }, 'topicsCount', 1);
        await manager.increment(Forum, { id: forum.id }, 'messagesCount', 1);
        await manager.update(Forum, forum.id, { lastMessageId: newPost.id });

        return { message: 'Nouveau sujet créé avec succès.' };
      });
    }

    throw new BadRequestException('Paramètres de publication invalides.');
  }
}

/**
 * NetTrader 2 — Service de Modération des Forums
 *
 * Usage:
 *   Permet la modération administrative des rubriques, le déplacement de discussions et l'édition de messages.
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ForumSection } from '../entities/forum-section.entity';
import { Forum } from '../entities/forum.entity';
import { Topic } from '../entities/topic.entity';
import { TopicPost } from '../entities/topic-post.entity';
import { TopicPostContent } from '../entities/topic-post-content.entity';

@Injectable()
export class AdminForumService {
  constructor(
    @InjectRepository(ForumSection)
    private readonly sectionRepository: Repository<ForumSection>,
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
   * Resynchronise les compteurs et le dernier message d'un forum.
   */
  async syncForumInternal(forumId: number) {
    await this.dataSource.query(
      `UPDATE f_sujet fs 
       SET s_nbmessages = GREATEST(0, (SELECT COUNT(*) FROM f_message fm WHERE fm.idsujet = fs.idsujet) - 1),
           idlastmessage = COALESCE((SELECT MAX(fm.idmessage) FROM f_message fm WHERE fm.idsujet = fs.idsujet), 0)
       WHERE fs.idforum = ?`,
      [forumId],
    );

    await this.dataSource.query(
      `UPDATE f_forum ff 
       SET nbsujets = (SELECT COUNT(*) FROM f_sujet fs WHERE fs.idforum = ff.idforum),
           nbmessages = COALESCE((SELECT COUNT(*) FROM f_message fm JOIN f_sujet fs ON fm.idsujet = fs.idsujet WHERE fs.idforum = ff.idforum), 0),
           idlastmessage = COALESCE((SELECT MAX(fs.idlastmessage) FROM f_sujet fs WHERE fs.idforum = ff.idforum), 0)
       WHERE ff.idforum = ?`,
      [forumId],
    );
  }

  // ---------------------------------------------------------------------------
  // Sections
  // ---------------------------------------------------------------------------

  async getForumSections() {
    const sections = await this.sectionRepository.find({ order: { id: 'ASC' } });
    return sections.map((s) => ({
      id: Number(s.id),
      name: s.name,
    }));
  }

  async createForumSection(name: string) {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new BadRequestException('Le libellé de la section est obligatoire.');
    }

    const saved = await this.sectionRepository.save({ title: cleanName });
    return { id: Number(saved.id), name: saved.title };
  }

  // ---------------------------------------------------------------------------
  // Forums
  // ---------------------------------------------------------------------------

  async getAdminForums() {
    const rows = await this.forumRepository.find({
      relations: ['section'],
      order: { sectionId: 'ASC', id: 'ASC' },
    });

    return rows.map((f) => ({
      id: Number(f.id),
      sectionId: Number(f.sectionId),
      sectionName: f.section?.title || 'Sans section',
      name: f.name.trim(),
      description: f.description || '',
      topicsCount: Number(f.topicsCount) || 0,
      messagesCount: Number(f.messagesCount) || 0,
      authread: f.authRead || 'ouvert',
      authwrite: f.authWrite || 'identifie',
    }));
  }

  async createAdminForum(data: {
    name: string;
    description: string;
    sectionId: number;
    authread: string;
    authwrite: string;
  }) {
    const name = data.name?.trim();
    if (!name) {
      throw new BadRequestException('Le nom du forum est obligatoire.');
    }

    const saved = await this.forumRepository.save({
      name,
      description: data.description?.trim() || '',
      sectionId: Number(data.sectionId || 1),
      authRead: data.authread || 'ouvert',
      authWrite: data.authwrite || 'identifie',
      topicsCount: 0,
      messagesCount: 0,
      lastMessageId: 0,
    });

    return { id: Number(saved.id) };
  }

  async updateAdminForum(
    id: number,
    data: {
      name: string;
      description: string;
      sectionId: number;
      authread: string;
      authwrite: string;
    },
  ) {
    const forum = await this.forumRepository.findOne({ where: { id } });
    if (!forum) {
      throw new NotFoundException('Forum introuvable.');
    }

    const name = data.name?.trim();
    if (!name) {
      throw new BadRequestException('Le nom du forum est obligatoire.');
    }

    await this.forumRepository.update(id, {
      name,
      description: data.description?.trim() || '',
      sectionId: Number(data.sectionId || forum.sectionId),
      authRead: data.authread || forum.authRead,
      authWrite: data.authwrite || forum.authWrite,
    });
  }

  async deleteAdminForum(id: number) {
    const forum = await this.forumRepository.findOne({ where: { id } });
    if (!forum) {
      throw new NotFoundException('Forum introuvable.');
    }

    // Suppression en cascade
    const topics = await this.topicRepository.find({ where: { forumId: id } });
    for (const t of topics) {
      const posts = await this.postRepository.find({ where: { topicId: t.id } });
      const postIds = posts.map((p) => p.id);
      if (postIds.length > 0) {
        await this.dataSource.query(
          `DELETE FROM f_corps WHERE idmessage IN (${postIds.join(',')})`,
        );
        await this.dataSource.query(
          `DELETE FROM f_message WHERE idmessage IN (${postIds.join(',')})`,
        );
      }
      await this.dataSource.query('DELETE FROM f_readsujet WHERE idsujet = ?', [t.id]);
    }

    await this.topicRepository.delete({ forumId: id });
    await this.dataSource.query('DELETE FROM f_readforum WHERE idforum = ?', [id]);
    await this.forumRepository.delete(id);
  }

  async syncAdminForum(id: number) {
    const forum = await this.forumRepository.findOne({ where: { id } });
    if (!forum) {
      throw new NotFoundException('Forum introuvable.');
    }
    await this.syncForumInternal(id);
  }

  // ---------------------------------------------------------------------------
  // Sujets (Topics)
  // ---------------------------------------------------------------------------

  async getAdminTopics(page: any = 1, limit: any = 20, forumId: any = 0, search = '') {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(5, Number(limit) || 20));
    const skip = (pageNum - 1) * take;
    const forumIdNum = Number(forumId) || 0;

    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (forumIdNum > 0) {
      whereConditions.push('fs.idforum = ?');
      params.push(forumIdNum);
    }

    if (search.trim()) {
      whereConditions.push('(fs.txtsujet LIKE ? OR ca.pseudonyme LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const whereSql = whereConditions.join(' AND ');

    const countSql = `SELECT COUNT(*) as total FROM f_sujet fs LEFT JOIN compte ca ON fs.idcompteauteur = ca.idcompte WHERE ${whereSql}`;
    const countRes = await this.dataSource.query(countSql, params);
    const total = Number(countRes?.[0]?.total || 0);

    const dataSql = `
      SELECT fs.idsujet AS id, fs.idforum AS forumId, ff.nomforum AS forumName,
             fs.txtsujet AS title, fs.idcompteauteur AS authorId, ca.pseudonyme AS authorPseudo,
             fs.s_nbmessages AS repliesCount, fs.nblectures AS viewsCount,
             cl.pseudonyme AS lastPoster, fm.datepost AS lastPostDate
      FROM f_sujet fs
      LEFT JOIN f_forum ff ON fs.idforum = ff.idforum
      LEFT JOIN compte ca ON fs.idcompteauteur = ca.idcompte
      LEFT JOIN f_message fm ON fs.idlastmessage = fm.idmessage
      LEFT JOIN compte cl ON fm.idcompte = cl.idcompte
      WHERE ${whereSql}
      ORDER BY fs.idlastmessage DESC
      LIMIT ?, ?
    `;

    const rawRows = await this.dataSource.query(dataSql, [...params, skip, take]);

    const items = rawRows.map((t: any) => ({
      id: Number(t.id),
      forumId: Number(t.forumId),
      forumName: t.forumName || 'Inconnu',
      title: (t.title || '').trim(),
      authorId: Number(t.authorId),
      authorPseudo: t.authorPseudo || 'Inconnu',
      repliesCount: Number(t.repliesCount) || 0,
      viewsCount: Number(t.viewsCount) || 0,
      lastPoster: t.lastPoster || '—',
      lastPostDate: Number(t.lastPostDate) || 0,
    }));

    return {
      items,
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async updateAdminTopic(id: number, data: { title?: string; forumId?: number }) {
    const topic = await this.topicRepository.findOne({ where: { id } });
    if (!topic) {
      throw new NotFoundException('Sujet introuvable.');
    }

    const oldForumId = topic.forumId;
    const title = data.title?.trim();
    const targetForumId = Number(data.forumId || 0);

    if (title) {
      await this.topicRepository.update(id, { title });
    }

    if (targetForumId > 0 && targetForumId !== oldForumId) {
      await this.topicRepository.update(id, { forumId: targetForumId });
      await this.syncForumInternal(oldForumId);
      await this.syncForumInternal(targetForumId);
    }
  }

  async deleteAdminTopic(id: number) {
    const topic = await this.topicRepository.findOne({ where: { id } });
    if (!topic) {
      throw new NotFoundException('Sujet introuvable.');
    }

    const forumId = topic.forumId;
    const posts = await this.postRepository.find({ where: { topicId: id } });
    const postIds = posts.map((p) => p.id);

    if (postIds.length > 0) {
      await this.dataSource.query(
        `DELETE FROM f_corps WHERE idmessage IN (${postIds.join(',')})`,
      );
      await this.dataSource.query(
        `DELETE FROM f_message WHERE idmessage IN (${postIds.join(',')})`,
      );
    }

    await this.dataSource.query('DELETE FROM f_readsujet WHERE idsujet = ?', [id]);
    await this.topicRepository.delete(id);

    await this.syncForumInternal(forumId);
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  async getAdminMessages(page: any = 1, limit: any = 20, query = '', author = '', topicId: any = 0) {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(50, Math.max(5, Number(limit) || 20));
    const skip = (pageNum - 1) * take;
    const topicIdNum = Number(topicId) || 0;

    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (topicIdNum > 0) {
      whereConditions.push('fm.idsujet = ?');
      params.push(topicIdNum);
    }

    if (query.trim()) {
      whereConditions.push('fc.contenu LIKE ?');
      params.push(`%${query.trim()}%`);
    }

    if (author.trim()) {
      whereConditions.push('cpt.pseudonyme LIKE ?');
      params.push(`%${author.trim()}%`);
    }

    const whereSql = whereConditions.join(' AND ');

    const countSql = `
      SELECT COUNT(*) as total
      FROM f_message fm
      JOIN f_corps fc ON fm.idmessage = fc.idmessage
      JOIN compte cpt ON fm.idcompte = cpt.idcompte
      WHERE ${whereSql}
    `;
    const countRes = await this.dataSource.query(countSql, params);
    const total = Number(countRes?.[0]?.total || 0);

    const dataSql = `
      SELECT fm.idmessage AS id, fm.idsujet AS topicId, fm.datepost AS date,
             fm.idcompte AS authorId, cpt.pseudonyme AS authorPseudo,
             fc.contenu AS content, fs.txtsujet AS topicTitle,
             fs.idforum AS forumId, ff.nomforum AS forumName
      FROM f_message fm
      JOIN f_corps fc ON fm.idmessage = fc.idmessage
      JOIN compte cpt ON fm.idcompte = cpt.idcompte
      JOIN f_sujet fs ON fm.idsujet = fs.idsujet
      JOIN f_forum ff ON fs.idforum = ff.idforum
      WHERE ${whereSql}
      ORDER BY fm.idmessage DESC
      LIMIT ?, ?
    `;

    const rawRows = await this.dataSource.query(dataSql, [...params, skip, take]);

    const items = rawRows.map((m: any) => ({
      id: Number(m.id),
      topicId: Number(m.topicId),
      topicTitle: (m.topicTitle || '').trim(),
      forumId: Number(m.forumId),
      forumName: (m.forumName || '').trim(),
      authorId: Number(m.authorId),
      authorPseudo: m.authorPseudo || 'Inconnu',
      date: Number(m.date),
      content: m.content || '',
    }));

    return {
      items,
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async updateAdminMessage(id: number, content: string) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Message introuvable.');
    }

    const cleanContent = content.trim();
    if (!cleanContent) {
      throw new BadRequestException('Le contenu ne peut être vide.');
    }

    await this.contentRepository.save({ id, content: cleanContent });
  }

  async deleteAdminMessage(id: number) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Message introuvable.');
    }

    const topic = await this.topicRepository.findOne({ where: { id: post.topicId } });
    const topicId = post.topicId;
    const forumId = topic?.forumId || 0;

    await this.contentRepository.delete(id);
    await this.postRepository.delete(id);

    const remaining = await this.postRepository.count({ where: { topicId } });
    if (remaining === 0) {
      await this.dataSource.query('DELETE FROM f_readsujet WHERE idsujet = ?', [topicId]);
      await this.topicRepository.delete(topicId);
    } else {
      const lastPost = await this.postRepository.findOne({
        where: { topicId },
        order: { id: 'DESC' },
      });
      await this.topicRepository.update(topicId, {
        messagesCount: remaining - 1,
        lastMessageId: lastPost ? lastPost.id : 0,
      });
    }

    if (forumId > 0) {
      await this.syncForumInternal(forumId);
    }
  }
}

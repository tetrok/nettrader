/**
 * NetTrader 2 — DTOs de Création de Contenu de Forum
 *
 * Usage:
 *   Valide la création de nouveaux sujets et réponses de discussion.
 */

import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PostMessageDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  forumId?: number;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  topicId?: number;

  @ApiPropertyOptional({ example: 'Nouvelle stratégie de trading' })
  @IsOptional()
  @IsString()
  @Length(3, 80)
  subject?: string;

  @ApiPropertyOptional({ example: 'Voici mon avis sur le marché actuel...' })
  @IsNotEmpty({ message: 'Le contenu du message est obligatoire.' })
  @IsString()
  @Length(1, 10000, { message: 'Le contenu du message ne doit pas dépasser 10 000 caractères.' })
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  editMessageId?: number;
}

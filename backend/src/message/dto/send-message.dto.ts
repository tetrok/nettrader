/**
 * NetTrader 2 — DTO d'Envoi de Message Privé
 *
 * Usage:
 *   Valide l'identifiant du destinataire, le titre du message et son contenu textuel.
 */

import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Administrateur', description: 'Pseudo ou ID du destinataire' })
  @IsNotEmpty({ message: 'Le destinataire est obligatoire.' })
  @IsString()
  recipient: string;

  @ApiProperty({ example: 'Conseil boursier', description: 'Titre du message' })
  @IsNotEmpty({ message: 'Le titre est obligatoire.' })
  @IsString()
  @Length(1, 120, { message: 'Le titre ne doit pas dépasser 120 caractères.' })
  title: string;

  @ApiProperty({ example: 'Bonjour, que penses-tu de 2CRSI ?', description: 'Corps du message' })
  @IsNotEmpty({ message: 'Le message est obligatoire.' })
  @IsString()
  @Length(1, 5000, { message: 'Le message ne doit pas dépasser 5000 caractères.' })
  content: string;
}

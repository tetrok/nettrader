/**
 * NetTrader 2 — DTO du Formulaire de Contact
 *
 * Usage:
 *   Valide l'e-mail, le nom, le sujet et le message soumis par le visiteur.
 */

import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty({ example: 'visiteur@exemple.com', description: 'Adresse email du contact' })
  @IsNotEmpty({ message: "L'adresse e-mail est obligatoire." })
  @IsEmail({}, { message: "Format d'adresse e-mail invalide." })
  @Length(5, 100, { message: "L'adresse e-mail doit comporter entre 5 et 100 caractères." })
  email: string;

  @ApiPropertyOptional({ example: 'Question sur les règles', description: 'Objet du message' })
  @IsOptional()
  @IsString()
  @Length(0, 150, { message: "L'objet ne doit pas dépasser 150 caractères." })
  subject?: string;

  @ApiProperty({ example: 'Bonjour, j\'ai une question...', description: 'Corps du message' })
  @IsNotEmpty({ message: 'Le message est obligatoire.' })
  @IsString()
  @Length(5, 5000, { message: 'Le message doit comporter entre 5 et 5000 caractères.' })
  message: string;
}

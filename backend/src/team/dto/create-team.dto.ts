/**
 * NetTrader 2 — DTO de Création d'Équipe
 *
 * Usage:
 *   Valide le nom, le tag (2 à 5 caractères), la description et le site web éventuel de l'équipe.
 */

import { IsNotEmpty, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'Wall Street Traders' })
  @IsNotEmpty({ message: 'Le nom de l\'équipe est obligatoire.' })
  @IsString()
  @Length(3, 50, { message: 'Le nom de l\'équipe doit comporter entre 3 et 50 caractères.' })
  name: string;

  @ApiProperty({ example: 'WST' })
  @IsNotEmpty({ message: 'Le sigle de l\'équipe est obligatoire.' })
  @IsString()
  @Length(2, 10, { message: 'Le sigle doit comporter entre 2 et 10 caractères.' })
  tag: string;

  @ApiPropertyOptional({ example: 'Une équipe de traders passionnés.' })
  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'La description ne doit pas dépasser 1000 caractères.' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsString()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: "L'adresse du site web doit être une URL valide (commençant par http:// ou https://)." },
  )
  @Length(0, 255, { message: "L'URL ne doit pas dépasser 255 caractères." })
  website?: string;
}

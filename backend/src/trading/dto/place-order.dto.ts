/**
 * NetTrader 2 — DTO de Passage d'Ordre Boursier (PlaceOrderDto)
 *
 * Usage:
 *   Valide le sens (achat/vente), la quantité, le code action, le type d'ordre et les seuils de cours éventuels.
 */

import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaceOrderDto {
  @ApiProperty({ enum: ['achat', 'vente'], example: 'achat', description: 'Sens de la transaction' })
  @IsNotEmpty()
  @IsIn(['achat', 'vente'], { message: "Le sens doit être 'achat' ou 'vente'." })
  sens: 'achat' | 'vente';

  @ApiProperty({ example: 101, description: 'Code de l\'action (codesicav)' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  codesicav: number;

  @ApiProperty({ example: 10, description: 'Nombre d\'actions à acheter ou vendre' })
  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: 'La quantité doit être supérieure à zéro.' })
  @Max(1000000, { message: 'La quantité ne peut pas dépasser 1 000 000 actions.' })
  quantity: number;

  @ApiPropertyOptional({ example: 0, description: 'Cours minimum / seuil de déclenchement' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Le cours minimum ne peut pas être négatif.' })
  @Max(1000000, { message: 'Le cours minimum ne peut pas dépasser 1 000 000 €.' })
  valmin?: number = 0;

  @ApiPropertyOptional({ example: 0, description: 'Cours maximum / plafond' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Le cours maximum ne peut pas être négatif.' })
  @Max(1000000, { message: 'Le cours maximum ne peut pas dépasser 1 000 000 €.' })
  valmax?: number = 0;

  @ApiPropertyOptional({ example: 30, description: 'Validité en jours (1 à 90 jours)' })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'La validité minimale est de 1 jour.' })
  @Max(90, { message: 'La validité maximale est de 90 jours.' })
  validity?: number;

  @ApiPropertyOptional({ example: '0', description: 'Activation du mode seuil (1 ou 0)' })
  @IsOptional()
  @IsIn(['0', '1'], { message: "Le champ seuil doit valoir '0' ou '1'." })
  seuil?: string;
}

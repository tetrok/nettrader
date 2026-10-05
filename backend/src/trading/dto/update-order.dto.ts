import {
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderDto {
  @ApiPropertyOptional({ example: 10, description: 'Nouvelle quantité d\'actions' })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'La quantité doit être supérieure à zéro.' })
  @Max(1000000, { message: 'La quantité ne peut pas dépasser 1 000 000 actions.' })
  quantity?: number;

  @ApiPropertyOptional({ example: 0, description: 'Cours minimum' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Le cours minimum ne peut pas être négatif.' })
  @Max(1000000, { message: 'Le cours minimum ne peut pas dépasser 1 000 000 €.' })
  valmin?: number;

  @ApiPropertyOptional({ example: 0, description: 'Cours maximum' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Le cours maximum ne peut pas être négatif.' })
  @Max(1000000, { message: 'Le cours maximum ne peut pas dépasser 1 000 000 €.' })
  valmax?: number;

  @ApiPropertyOptional({ example: 30, description: 'Validité en jours (1 à 90 jours)' })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'La validité minimale est de 1 jour.' })
  @Max(90, { message: 'La validité maximale est de 90 jours.' })
  validity?: number;
}

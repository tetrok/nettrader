/**
 * NetTrader 2 — Contrôleur REST de Messagerie Privée
 *
 * Usage:
 *   Expose les routes /api/messages pour l'échange de messages entre traders.
 *
 * Logique & Fonctionnement:
 *   - getInbox() / getSent() : consultation des messages reçus et envoyés.
 *   - sendMessage() : envoi d'un message avec contrôle anti-spam et vérification du destinataire.
 *   - markAsRead() / deleteMessage() : marquage comme lu ou suppression d'un message.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Messages')
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Boîte de réception du joueur' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getInbox(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messageService.getInbox(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Envoi d\'un message privé à un joueur' })
  async sendMessage(@CurrentUser() user: User, @Body() dto: SendMessageDto) {
    return this.messageService.sendMessage(user.id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suppression d\'un message reçu' })
  async deleteMessage(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messageService.deleteMessage(user.id, id);
  }
}

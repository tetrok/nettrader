/**
 * NetTrader 2 — Contrôleur REST des Contenus Statiques & Assistance
 *
 * Usage:
 *   Expose les règles de trading, l'aide aux débutants et la réception du formulaire de contact (/api/content).
 */

import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { ContactDto } from './dto/contact.dto';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('rules')
  @ApiOperation({ summary: 'Règlement officiel du jeu' })
  getRules() {
    return this.contentService.getRules();
  }

  @Get('help')
  @ApiOperation({ summary: 'Rubrique d\'aide' })
  @ApiQuery({ name: 'id', required: false })
  getHelp(@Query('id') id?: number) {
    return this.contentService.getHelp(id ? Number(id) : undefined);
  }

  @Get('faq')
  @ApiOperation({ summary: 'Foire aux questions' })
  @ApiQuery({ name: 'id', required: false })
  getFaq(@Query('id') id?: number) {
    return this.contentService.getFaq(id ? Number(id) : undefined);
  }

  @Post('contact')
  @ApiOperation({ summary: 'Formulaire de contact' })
  async contact(@Body() dto: ContactDto) {
    return this.contentService.sendContact(
      dto.email,
      dto.subject || '',
      dto.message,
    );
  }
}

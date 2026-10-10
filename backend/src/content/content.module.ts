/**
 * NetTrader 2 — Module NestJS des Contenus Statiques
 *
 * Usage:
 *   Assemble ContentController et ContentService.
 */

import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}

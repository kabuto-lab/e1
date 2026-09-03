/**
 * ModelStatsController — статистика анкеты (просмотры/избранное/обращения) + запись событий.
 */

import { Body, Controller, Get, Ip, NotFoundException, Param, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { JwtAuthGuard, type RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import { ModelsService } from '../models/models.service';
import { ModelStatsService, type ContactChannel } from './model-stats.service';

class RecordContactEventDto {
  @IsString()
  @IsIn(['click', 'telegram', 'platform'])
  channel!: ContactChannel;
}

@ApiTags('Model Stats')
@Controller('models')
export class ModelStatsController {
  constructor(
    private readonly modelStatsService: ModelStatsService,
    private readonly modelsService: ModelsService,
  ) {}

  @Get('me/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODEL, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика анкеты текущей модели: просмотры, избранное, обращения' })
  async getMyStats(@Request() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const profile = await this.modelsService.findByUserId(userId);
    if (!profile) throw new NotFoundException('Анкета ещё не создана');
    return this.modelStatsService.getStatsForModel(profile.id);
  }

  @Get('me/manager-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Агрегированная статистика по всем моделям, привязанным к текущему менеджеру' })
  async getMyManagerStats(@Request() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.modelStatsService.getStatsForManager(userId);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Зафиксировать просмотр анкеты (дедуп по IP+дню, публичный)' })
  async recordView(@Param('id') id: string, @Ip() ip: string) {
    await this.modelStatsService.recordView(id, ip);
    return { ok: true };
  }

  @Post(':id/contact-event')
  @ApiOperation({ summary: 'Зафиксировать событие воронки обращения — клик/telegram/платформа (публичный)' })
  async recordContactEvent(@Param('id') id: string, @Body() body: RecordContactEventDto) {
    await this.modelStatsService.recordContactEvent(id, body.channel);
    return { ok: true };
  }
}

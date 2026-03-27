/**
 * Blacklist Controller - endpoints для чёрного списка
 */

import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BlacklistService } from './blacklist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';

class AddToBlacklistDto {
  entityType: 'model' | 'client';
  entityId: string;
  reason: 'fake_photos' | 'client_complaints' | 'fraud' | 'no_show' | 'video_fake' | 'non_payment' | 'rudeness' | 'pressure';
  description?: string;
}

@ApiTags('Blacklist')
@Controller('blacklist')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика чёрного списка' })
  async getStats() {
    return this.blacklistService.getStats();
  }

  @Get('check/:entityType/:entityId')
  @ApiOperation({ summary: 'Проверить, в чёрном ли списке' })
  async check(@Param('entityType') entityType: 'model' | 'client', @Param('entityId') entityId: string) {
    const isBlacklisted = await this.blacklistService.isBlacklisted(entityType, entityId);
    return { entityType, entityId, isBlacklisted };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Запись по ID' })
  async getById(@Param('id') id: string) {
    return this.blacklistService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить в чёрный список' })
  async add(@Body() body: AddToBlacklistDto, @Request() req) {
    return this.blacklistService.addToBlacklist({
      ...body,
      blockedBy: req.user.userId,
    });
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Восстановить из чёрного списка' })
  async restore(@Param('id') id: string, @Request() req) {
    return this.blacklistService.restore(id, req.user.userId);
  }
}

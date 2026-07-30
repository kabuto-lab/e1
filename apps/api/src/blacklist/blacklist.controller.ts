/**
 * Blacklist Controller - endpoints для чёрного списка
 */

import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn, IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';
import { BlacklistService } from './blacklist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';

const ENTITY_TYPES = ['model', 'client', 'manager'] as const;
const REASONS = [
  'fake_photos',
  'client_complaints',
  'fraud',
  'no_show',
  'video_fake',
  'non_payment',
  'rudeness',
  'pressure',
] as const;

// whitelist:true в глобальном ValidationPipe (main.ts) молча вырезает поля без декораторов —
// без них DTO приезжает в сервис пустым объектом, а postgres-js падает на undefined-параметрах.
class AddToBlacklistDto {
  @IsIn(ENTITY_TYPES) entityType: 'model' | 'client' | 'manager';
  @IsUUID() entityId: string;
  @IsIn(REASONS) reason: (typeof REASONS)[number];
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

class RestoreByEntityDto {
  @IsIn(ENTITY_TYPES) entityType: 'model' | 'client' | 'manager';
  @IsUUID() entityId: string;
}

@ApiTags('Blacklist')
@Controller('blacklist')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика чёрного списка' })
  async getStats() {
    return this.blacklistService.getStats();
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Полная история блокировок (активные + восстановленные) для страницы «Чёрный список»' })
  async getHistory() {
    return this.blacklistService.getHistory();
  }

  @Get('check/:entityType/:entityId')
  @ApiOperation({ summary: 'Проверить, в чёрном ли списке' })
  async check(@Param('entityType') entityType: 'model' | 'client' | 'manager', @Param('entityId') entityId: string) {
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
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить в чёрный список (Admin/Moderator only) — блокирует и вход в аккаунт' })
  async add(@Body() body: AddToBlacklistDto, @Request() req) {
    return this.blacklistService.addToBlacklist({
      ...body,
      blockedBy: req.user.userId,
    });
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Восстановить из чёрного списка по id записи (Admin/Moderator only)' })
  async restore(@Param('id') id: string, @Request() req) {
    return this.blacklistService.restore(id, req.user.userId);
  }

  @Post('restore-by-entity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Восстановить по entityId — снимает последнюю активную блокировку (Admin/Moderator only)' })
  async restoreByEntity(@Body() body: RestoreByEntityDto, @Request() req) {
    return this.blacklistService.restoreByEntity(body.entityType, body.entityId, req.user.userId);
  }
}

/**
 * Clients Controller - endpoints для профилей клиентов
 */

import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import type { ClientProfile } from '@escort/db';

class UpdateClientProfileDto {
  trustScore?: string;
  preferences?: any;
  archetypes?: string[];
}

class UpdateOwnContactsDto {
  @ApiProperty({ required: false, description: 'Пустая строка — сбросить' })
  @IsOptional()
  @IsString()
  contactTelegram?: string;

  @ApiProperty({ required: false, description: 'Пустая строка — сбросить' })
  @IsOptional()
  @IsString()
  contactWhatsapp?: string;
}

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика по клиентам' })
  async getStats(): Promise<any> {
    return this.clientsService.getStats();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мой профиль клиента' })
  async getMyProfile(@Request() req): Promise<ClientProfile | null> {
    return this.clientsService.findByUserId(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить свои контакты (Telegram/Whatsapp) — не TG-логин, отдельное поле связи' })
  async updateMyContacts(@Request() req, @Body() body: UpdateOwnContactsDto): Promise<ClientProfile> {
    return this.clientsService.updateOwnContacts(req.user.userId, body);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профиль клиента по ID' })
  async getById(@Param('id') id: string): Promise<ClientProfile | null> {
    return this.clientsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать профиль клиента' })
  @ApiResponse({ status: 201, description: 'Профиль создан' })
  async create(@Request() req): Promise<ClientProfile> {
    return this.clientsService.createProfile(req.user.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить профиль клиента' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateClientProfileDto,
  ): Promise<ClientProfile> {
    return this.clientsService.updateProfile(id, body);
  }

  @Put(':id/vip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить VIP статус (Admin only)' })
  async updateVip(
    @Param('id') id: string,
    @Body('tier') tier: 'standard' | 'silver' | 'gold' | 'platinum',
  ): Promise<ClientProfile> {
    const profile = await this.clientsService.findById(id);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }
    return this.clientsService.updateVipTier(profile.userId, tier);
  }

  @Put(':id/psychotype')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить психотип' })
  async updatePsychotype(
    @Param('id') id: string,
    @Body('psychotype') psychotype: string,
  ): Promise<ClientProfile> {
    const profile = await this.clientsService.findById(id);
    if (!profile) {
      throw new BadRequestException('Profile not found');
    }
    return this.clientsService.updatePsychotype(profile.userId, psychotype);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить профиль клиента' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.clientsService.deleteProfile(id);
  }

  @Get('me/favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список избранных моделей текущего клиента' })
  async getMyFavorites(@Request() req) {
    return this.clientsService.getFavorites(req.user.userId);
  }

  @Post('me/favorites/:modelId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить модель в избранное' })
  @ApiResponse({ status: 201 })
  async addFavorite(@Request() req, @Param('modelId') modelId: string) {
    return this.clientsService.addFavorite(req.user.userId, modelId);
  }

  @Delete('me/favorites/:modelId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить модель из избранного' })
  async removeFavorite(@Request() req, @Param('modelId') modelId: string): Promise<void> {
    return this.clientsService.removeFavorite(req.user.userId, modelId);
  }
}

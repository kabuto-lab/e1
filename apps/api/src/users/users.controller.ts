/**
 * Users Controller - HTTP endpoints для работы с пользователями
 */

import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import type { User } from '@escort/db';

class CreateUserDto {
  email: string;
  password: string;
  role?: 'client' | 'model';
}

class UserResponseDto {
  id: string;
  email: string;
  role: string;
  status: string;
  clerkId?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  telegramId?: string | null;
  telegramUsername?: string | null;
  telegramLinkedAt?: Date | null;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать нового пользователя (Admin only)' })
  @ApiResponse({ status: 201, description: 'Пользователь создан' })
  @ApiResponse({ status: 409, description: 'Email уже занят' })
  async create(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.usersService.createUser(body.email, body.password, body.role);
    return this.toResponse(user, body.email);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить всех пользователей (Admin only)' })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  async findAll(): Promise<UserResponseDto[]> {
    const userList = await this.usersService.findAll();
    return userList.map((u: User) => this.toResponse(u, ''));
  }

  @Get('me/telegram-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[deprecated] Статус привязки Telegram',
    description:
      'Используется фронтом для polling после создания link-token. ' +
      '⚠️ DEPRECATED: используй /auth/me — там те же поля в `telegram.*`. ' +
      'Этот endpoint оставлен как алиас для существующих клиентов.',
    deprecated: true,
  })
  @ApiResponse({ status: 200, description: 'Статус получен' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async getTelegramStatus(@Request() req): Promise<{
    linked: boolean;
    telegramId: string | null;
    telegramUsername: string | null;
    telegramLinkedAt: Date | null;
  }> {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) throw new NotFoundException('User not found');
    return {
      linked: user.telegramId !== null && user.telegramId !== undefined,
      telegramId: user.telegramId ? user.telegramId.toString() : null,
      telegramUsername: user.telegramUsername,
      telegramLinkedAt: user.telegramLinkedAt,
    };
  }

  @Delete('me/telegram')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Отвязать Telegram от текущего пользователя',
    description:
      'Обнуляет telegram_id/telegram_username/telegram_linked_at. TG-only user (без email/password) ' +
      'получит 400, чтобы не заблокировать вход.',
  })
  @ApiResponse({ status: 200, description: 'Telegram отвязан' })
  @ApiResponse({ status: 400, description: 'TG-only user — отвязка заблокирует вход' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async unlinkTelegram(@Request() req): Promise<{
    linked: false;
    telegramId: null;
    telegramUsername: null;
    telegramLinkedAt: null;
  }> {
    await this.usersService.unlinkTelegramIdentity(req.user.userId);
    return { linked: false, telegramId: null, telegramUsername: null, telegramLinkedAt: null };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  @ApiResponse({ status: 200, description: 'Пользователь найден' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toResponse(user, '');
  }

  @Post(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить статус пользователя (Admin only)' })
  @ApiResponse({ status: 200, description: 'Статус обновлён' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: User['status'],
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateStatus(id, status);
    return this.toResponse(user, '');
  }

  private toResponse(user: User, email: string): UserResponseDto {
    return {
      id: user.id,
      email: email || '[hidden]',
      role: user.role,
      status: user.status,
      clerkId: user.clerkId || undefined,
      lastLogin: user.lastLogin || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      telegramId: user.telegramId ? user.telegramId.toString() : null,
      telegramUsername: user.telegramUsername ?? null,
      telegramLinkedAt: user.telegramLinkedAt ?? null,
    };
  }
}

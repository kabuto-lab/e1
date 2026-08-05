/**
 * Users Controller - HTTP endpoints для работы с пользователями
 */

import { Controller, Get, Post, Patch, Delete, Query,  Body, Param, UseGuards, Request, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import type { User } from '@escort/db';

class CreateUserDto {
  @IsString()
  login: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsIn(['client', 'model', 'moderator'])
  role?: 'client' | 'model' | 'moderator';
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
  /** Admin-only: для сверки при обращении пользователя на восстановление доступа. */
  login?: string | null;
  recoveryCode?: string | null;
  /** Admin-only: пароль аккаунтов, созданных менеджером/админом за модель (см. ModelsService.createFullProfile). */
  initialPassword?: string | null;
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
  @ApiResponse({ status: 409, description: 'Логин уже занят' })
  async create(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    if (!body.login || !body.password) {
      throw new BadRequestException('Login and password are required');
    }

    const user = await this.usersService.createUser({
      login: body.login,
      password: body.password,
      role: body.role,
    });
    return this.toResponse(user, user.email ?? '');
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить всех пользователей (Admin/Moderator)' })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  async findAll(
    @Query('role') role?: User['role'],
    @Query('limit') limitRaw?: string,
  ): Promise<UserResponseDto[]> {
    // Дефолт 50 не годится для страницы «Пользователи» — там на этом списке строится
    // группировка моделей по менеджеру, и менеджер, не попавший в первые 50, «терял» моделей.
    const limit = Math.min(Math.max(parseInt(limitRaw ?? '', 10) || 50, 1), 1000);
    const userList = await this.usersService.findAll(limit, 0, role);
    return userList.map((u: User) => this.toResponse(u, u.email ?? ''));
  }

  @Get('blockable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Поиск client/model/manager для блокировки (Admin/Moderator only)',
    description: 'Узкая выборка без recoveryCode/initialPassword — в отличие от GET /users, доступна moderator.',
  })
  async searchBlockable(@Query('query') query?: string): Promise<Array<{ id: string; login: string | null; email: string | null; role: string; status: string }>> {
    return this.usersService.searchBlockable(query);
  }

  @Get('managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Все менеджеры (для группировки моделей на странице «Пользователи → Доли»)',
  })
  async listManagers(): Promise<Array<{ id: string; login: string | null; email: string | null }>> {
    return this.usersService.listManagers();
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

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Сменить роль пользователя (Admin/Moderator)',
    description:
      'Только между client/moderator/admin — у model/manager есть привязанный профиль ' +
      '(model_profiles/manager_profiles), простая смена role оставила бы его в противоречивом состоянии. ' +
      'Moderator не может назначать роль admin и не может менять роль у существующих admin-аккаунтов ' +
      '(защита от эскалации привилегий через этот же эндпоинт).',
  })
  @ApiResponse({ status: 200, description: 'Роль обновлена' })
  @ApiResponse({ status: 400, description: 'Недопустимая роль или попытка сменить себе роль' })
  @ApiResponse({ status: 403, description: 'Moderator не может назначать/трогать роль admin' })
  async updateRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @Request() req: { user: { userId: string; role: string } },
  ): Promise<UserResponseDto> {
    if (req.user.userId === id) {
      throw new BadRequestException('Нельзя изменить собственную роль');
    }
    if (req.user.role === Role.MODERATOR) {
      if (role === 'admin') {
        throw new ForbiddenException('Moderator не может назначать роль admin');
      }
      const target = await this.usersService.findById(id);
      if (target?.role === 'admin') {
        throw new ForbiddenException('Moderator не может менять роль у admin-аккаунта');
      }
    }
    const user = await this.usersService.updateRole(id, role as 'client' | 'moderator' | 'admin');
    return this.toResponse(user, '');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Удалить пользователя (Admin/Moderator)',
    description: 'Разрешено только для role=moderator|manager|model — удаление client/admin тут не поддерживается.',
  })
  @ApiResponse({ status: 200, description: 'Пользователь удалён' })
  @ApiResponse({ status: 400, description: 'Роль не подлежит удалению этим методом' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'moderator' && user.role !== 'manager' && user.role !== 'model') {
      throw new BadRequestException('Only moderator, manager or model accounts can be deleted here');
    }
    await this.usersService.deleteUser(id);
    return { success: true };
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
      login: user.login ?? null,
      recoveryCode: user.recoveryCode ?? null,
      initialPassword: user.initialPassword ?? null,
    };
  }
}

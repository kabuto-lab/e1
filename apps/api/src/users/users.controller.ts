/**
 * Users Controller - HTTP endpoints для работы с пользователями
 */

import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import type { User } from '@escort/db';

// DTOs
class CreateUserDto {
  email: string;
  password: string;
  role?: 'client' | 'model' | 'admin' | 'manager';
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
}

// Simple auth guard placeholder
class AuthGuard {
  canActivate() {
    // TODO: Implement real JWT guard
    return true;
  }
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Создать нового пользователя' })
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
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить всех пользователей (Admin only)' })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  async findAll(@Request() req): Promise<UserResponseDto[]> {
    // TODO: Check admin role
    const userList = await this.usersService.findAll();
    return userList.map((u: User) => this.toResponse(u, ''));
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  @ApiResponse({ status: 200, description: 'Пользователь найден' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async findOne(@Param('id') id: string, @Request() req): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    // TODO: Check permissions
    return this.toResponse(user, '');
  }

  @Post(':id/status')
  @UseGuards(AuthGuard)
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
    };
  }
}

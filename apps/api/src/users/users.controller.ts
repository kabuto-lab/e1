/**
 * Users Controller - HTTP endpoints для работы с пользователями
 */

import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException, NotFoundException } from '@nestjs/common';
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
    };
  }
}

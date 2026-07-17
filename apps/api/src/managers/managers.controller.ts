import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request, HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import { ManagersService } from './managers.service';

class RejectDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

class UpdateManagerProfileDto {
  @ApiProperty({ required: false, description: 'Пустая строка — сбросить' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, description: 'Пустая строка — сбросить' })
  @IsOptional()
  @IsString()
  telegramContact?: string;

  @ApiProperty({ required: false, description: 'Пустая строка — сбросить' })
  @IsOptional()
  @IsString()
  contactWhatsapp?: string;

  @ApiProperty({ required: false, description: 'Пустая строка — сбросить' })
  @IsOptional()
  @IsString()
  companyName?: string;
}

@ApiTags('Managers')
@Controller('managers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ManagersController {
  constructor(private readonly managersService: ManagersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Профиль текущего менеджера' })
  async getMe(@Request() req) {
    const profile = await this.managersService.getProfile(req.user.userId);
    if (!profile) throw new NotFoundException('Manager profile not found');
    return profile;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Обновить свои телефон/telegram' })
  async updateMe(@Request() req, @Body() body: UpdateManagerProfileDto) {
    return this.managersService.updateOwnProfile(req.user.userId, body);
  }
}

@ApiTags('Managers')
@Controller('admin/managers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
@ApiBearerAuth()
export class AdminManagersController {
  constructor(private readonly managersService: ManagersService) {}

  @Get('applications')
  @ApiOperation({ summary: 'Список заявок менеджеров (все роли manager)' })
  @ApiResponse({ status: 200, description: 'Список менеджеров' })
  async listApplications() {
    return this.managersService.listApplications();
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Одобрить менеджера' })
  async approve(@Param('id') id: string, @Request() req) {
    return this.managersService.approve(id, req.user.userId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отклонить менеджера' })
  async reject(@Param('id') id: string, @Body() body: RejectDto) {
    return this.managersService.reject(id, body.reason);
  }
}

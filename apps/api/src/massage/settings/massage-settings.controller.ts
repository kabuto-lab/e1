import { Body, Controller, Get, Header, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MassageSettingsService } from './massage-settings.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../../auth/guards/roles.guard';

class SaveMassageSettingsDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsEnum(['open', 'closed']) catalogMode?: 'open' | 'closed';
  @IsOptional() @IsString() @MaxLength(100) siteName?: string;
}

@ApiTags('massage-settings')
@Controller('massage/settings')
export class MassageSettingsController {
  constructor(private readonly settingsService: MassageSettingsService) {}

  @Get('public')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @ApiOperation({ summary: 'Публичный флаг массажного режима (без JWT) — читается на общих страницах' })
  async getPublic() {
    return this.settingsService.getPublic();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Полные настройки массажного режима (staff)' })
  async get() {
    return this.settingsService.get();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Сохранить настройки массажного режима (staff)' })
  async save(@Body() body: SaveMassageSettingsDto) {
    return this.settingsService.save(body);
  }
}

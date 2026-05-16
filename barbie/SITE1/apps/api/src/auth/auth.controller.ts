import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { SkipTenant } from '../tenant-context/tenant.decorator';
import type { AuthenticatedUser } from './types/jwt-payload';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @SkipTenant()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login: tenant-user (с subdomain или X-Tenant-Slug) ИЛИ platform-admin (без tenant)',
  })
  login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.auth.login(body.email, body.password);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Текущий пользователь из JWT (быстрая проверка токена)' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

/**
 * Auth Controller - endpoints для регистрации и входа
 */

import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BotSecretGuard } from './guards/bot-secret.guard';
import { TelegramLinkTokenService } from './telegram-link-token.service';
import { UsersService } from '../users/users.service';

import { IsEmail, IsString, MinLength, IsOptional, IsIn, Matches, IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ required: false, enum: ['client', 'model'] })
  @IsOptional()
  @IsIn(['client', 'model'])
  role?: 'client' | 'model';
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class TelegramConsumeDto {
  @ApiProperty({ example: 'a1b2c3…64hex', description: '64-hex token из /auth/telegram/link-token' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, { message: 'token must be 64 hex characters' })
  token: string;

  @ApiProperty({ example: '123456789', description: 'Telegram user id (ctx.from.id) — числовая строка' })
  @IsNumberString()
  telegramId: string;

  @ApiProperty({ required: false, example: 'lovnge_user' })
  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @ApiProperty({ required: false, example: 'ru' })
  @IsOptional()
  @IsString()
  telegramLanguageCode?: string;
}

export class TelegramLoginDto {
  @ApiProperty({ example: '123456789' })
  @IsNumberString()
  telegramId: string;
}

export class TelegramRegisterDto {
  @ApiProperty({ example: '123456789' })
  @IsNumberString()
  telegramId: string;

  @ApiProperty({ required: false, example: 'lovnge_user' })
  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @ApiProperty({ required: false, example: 'ru' })
  @IsOptional()
  @IsString()
  telegramLanguageCode?: string;

  @ApiProperty({ required: false, enum: ['client', 'model'], default: 'client' })
  @IsOptional()
  @IsIn(['client', 'model'])
  role?: 'client' | 'model';
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly telegramLinkTokenService: TelegramLinkTokenService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({ status: 201, description: 'Успешная регистрация' })
  @ApiResponse({ status: 409, description: 'Email уже занят' })
  async register(@Body() body: RegisterDto) {
    return await this.authService.register(body.email, body.password, body.role || 'client');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  @ApiResponse({ status: 401, description: 'Неверные учётные данные' })
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить токены' })
  @ApiResponse({ status: 200, description: 'Токены обновлены' })
  @ApiResponse({ status: 401, description: 'Невалидный refresh токен' })
  async refresh(@Body() body: RefreshTokenDto) {
    return await this.authService.refreshTokens(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выход из системы' })
  async logout(@Request() req) {
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить текущий профиль',
    description:
      'Возвращает JWT-payload + свежие поля из users (роль/статус/subscriptionTier), а также состояние Telegram-линковки. Один endpoint заменяет старые /users/me/telegram-status.',
  })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  async getProfile(@Request() req) {
    const userId = req.user.userId as string;
    const user = await this.usersService.findById(userId);
    return {
      ...req.user,
      // Перекрываем status/role/subscriptionTier свежими из БД — JWT мог устареть
      // (например, админ заблокировал аккаунт в течение жизни access-token'а).
      role: user?.role ?? req.user.role,
      status: user?.status ?? 'active',
      subscriptionTier: user?.subscriptionTier ?? req.user.subscriptionTier ?? 'none',
      telegram: {
        linked: user?.telegramId != null,
        telegramId: user?.telegramId ? user.telegramId.toString() : null,
        telegramUsername: user?.telegramUsername ?? null,
        telegramLinkedAt: user?.telegramLinkedAt ?? null,
      },
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Telegram (web-first linking, §Q2)
  // ───────────────────────────────────────────────────────────────────────────

  @Post('telegram/link-token')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Создать одноразовый link-token для привязки Telegram',
    description:
      'Авторизованный user получает 64-hex токен и deep-link t.me/<bot>?start=link_<token>. TTL задаётся TELEGRAM_LINK_TOKEN_TTL_SEC (дефолт 300с). deepLink = null, если TELEGRAM_BOT_USERNAME не задан в env.',
  })
  @ApiResponse({ status: 201, description: 'Токен создан' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async createTelegramLinkToken(@Request() req) {
    const userId = req.user.userId as string;
    return this.telegramLinkTokenService.createLinkToken(userId);
  }

  @Post('telegram/consume')
  @HttpCode(HttpStatus.OK)
  @UseGuards(BotSecretGuard)
  @ApiHeader({ name: 'x-bot-secret', required: true, description: 'Shared secret = TELEGRAM_BOT_SECRET' })
  @ApiOperation({
    summary: 'Потребить link-token и привязать telegram_id к user (bot-side)',
    description:
      'Вызывается Telegram-ботом после /start link_<token>. Атомарно помечает токен как consumed и пишет telegram_id/username/language_code в users.',
  })
  @ApiResponse({ status: 200, description: 'Линковка завершена' })
  @ApiResponse({ status: 400, description: 'Token invalid / expired / already used' })
  @ApiResponse({ status: 401, description: 'Нет или неверный x-bot-secret' })
  @ApiResponse({ status: 409, description: 'Telegram ID уже привязан к другому user' })
  @ApiResponse({ status: 503, description: 'TELEGRAM_BOT_SECRET не настроен' })
  async consumeTelegramLink(@Body() body: TelegramConsumeDto) {
    const { userId } = await this.telegramLinkTokenService.consumeToken(body.token);
    const updated = await this.usersService.linkTelegramIdentity(userId, {
      telegramId: body.telegramId,
      telegramUsername: body.telegramUsername ?? null,
      telegramLanguageCode: body.telegramLanguageCode ?? null,
    });
    return {
      userId: updated.id,
      telegramId: updated.telegramId ? updated.telegramId.toString() : null,
      telegramUsername: updated.telegramUsername,
      telegramLinkedAt: updated.telegramLinkedAt,
    };
  }

  @Post('telegram/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(BotSecretGuard)
  @ApiHeader({ name: 'x-bot-secret', required: true, description: 'Shared secret = TELEGRAM_BOT_SECRET' })
  @ApiOperation({
    summary: 'Выдать JWT по Telegram ID (bot-side)',
    description:
      'Бот вызывает, когда залогиненный в TG user без активной web-сессии хочет открыть ЛК. Возвращает accessToken/refreshToken для уже связанного пользователя.',
  })
  @ApiResponse({ status: 200, description: 'Токены выданы' })
  @ApiResponse({ status: 401, description: 'Нет или неверный x-bot-secret / tgId не привязан' })
  @ApiResponse({ status: 503, description: 'TELEGRAM_BOT_SECRET не настроен' })
  async loginByTelegram(@Body() body: TelegramLoginDto) {
    return this.authService.loginByTelegramId(body.telegramId);
  }

  @Post('telegram/register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(BotSecretGuard)
  @ApiHeader({ name: 'x-bot-secret', required: true, description: 'Shared secret = TELEGRAM_BOT_SECRET' })
  @ApiOperation({
    summary: 'Зарегистрировать TG-only пользователя (bot-side)',
    description:
      'Бот вызывает, когда /start приходит от незнакомого telegramId. Создаёт client (или model) без email/password, сразу выдаёт JWT. CHECK constraint в БД запрещает создавать staff-роли этим путём.',
  })
  @ApiResponse({ status: 201, description: 'Пользователь создан + токены выданы' })
  @ApiResponse({ status: 401, description: 'Нет или неверный x-bot-secret' })
  @ApiResponse({ status: 409, description: 'Telegram ID уже занят (есть user)' })
  @ApiResponse({ status: 503, description: 'TELEGRAM_BOT_SECRET не настроен' })
  async registerByTelegram(@Body() body: TelegramRegisterDto) {
    return this.authService.registerByTelegram({
      telegramId: body.telegramId,
      telegramUsername: body.telegramUsername ?? null,
      telegramLanguageCode: body.telegramLanguageCode ?? null,
      role: body.role,
    });
  }
}

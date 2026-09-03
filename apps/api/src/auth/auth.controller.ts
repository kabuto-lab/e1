/**
 * Auth Controller - endpoints для регистрации и входа
 */

import { Controller, Post, Get, Patch, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BotSecretGuard } from './guards/bot-secret.guard';
import { TelegramLinkTokenService } from './telegram-link-token.service';
import { UsersService } from '../users/users.service';

import { IsString, MinLength, IsOptional, IsIn, Matches, IsNumberString, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'ivan_petrov', description: '3-32 символа: латиница, цифры, "_" и "."' })
  @IsString()
  @Matches(/^[a-zA-Z0-9_.]{3,32}$/, { message: 'Логин: 3-32 символа, латиница/цифры/"_"/"."' })
  login!: string;

  @ApiProperty({ example: 'password123', description: 'Минимум 8 символов, хотя бы одна буква и одна цифра' })
  @IsString()
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, {
    message: 'Пароль: минимум 8 символов, хотя бы одна буква и одна цифра',
  })
  password!: string;

  @ApiProperty({ required: false, enum: ['client', 'model', 'manager'] })
  @IsOptional()
  @IsIn(['client', 'model', 'manager'])
  role?: 'client' | 'model' | 'manager';

  @ApiProperty({ required: false, example: '+79001234567', description: 'Только для клиента, необязательно' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Введите корректный номер телефона' })
  @MaxLength(20, { message: 'Номер телефона слишком длинный' })
  phone?: string;

  @ApiProperty({ enum: ['phone', 'telegram', 'email', 'whatsapp'], description: 'Обязательно для модели и менеджера' })
  @ValidateIf((o) => o.role === 'model' || o.role === 'manager')
  @IsIn(['phone', 'telegram', 'email', 'whatsapp'], { message: 'Выберите способ связи' })
  contactMethod?: 'phone' | 'telegram' | 'email' | 'whatsapp';

  @ApiProperty({ example: '@ivan_model', description: 'Обязательно для модели и менеджера — значение выбранного contactMethod' })
  @ValidateIf((o) => o.role === 'model' || o.role === 'manager')
  @IsString()
  @MinLength(1, { message: 'Укажите контакт для связи' })
  contactValue?: string;

  @ApiProperty({ required: false, example: 'Elite Agency', description: 'Только для менеджера' })
  @IsOptional()
  @IsString()
  companyName?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'Иван Петров' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false, example: '+79001234567', description: 'Пустая строка — сбросить' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, example: 'user@example.com', description: 'Пустая строка — сбросить' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'ivan_petrov', description: 'Логин' })
  @IsString()
  identifier!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class TelegramConsumeDto {
  @ApiProperty({ example: 'a1b2c3…48hex', description: '48-hex token из /auth/telegram/link-token' })
  @IsString()
  @Matches(/^[a-f0-9]{48}$/i, { message: 'token must be 48 hex characters' })
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
    return await this.authService.register(body.login, body.password, body.role || 'client', {
      phone: body.phone,
      companyName: body.companyName,
      contactMethod: body.contactMethod,
      contactValue: body.contactValue,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  @ApiResponse({ status: 401, description: 'Неверные учётные данные' })
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body.identifier, body.password);
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
      email: user?.email ?? req.user.email ?? '',
      fullName: user?.fullName ?? null,
      login: user?.login ?? null,
      phone: user?.phone ?? null,
      telegram: {
        linked: user?.telegramId != null,
        telegramId: user?.telegramId ? user.telegramId.toString() : null,
        telegramUsername: user?.telegramUsername ?? null,
        telegramLinkedAt: user?.telegramLinkedAt ?? null,
      },
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить имя/телефон/email текущего пользователя' })
  @ApiResponse({ status: 409, description: 'Телефон или email уже заняты другим аккаунтом' })
  async updateProfile(@Request() req: any, @Body() body: UpdateProfileDto) {
    const userId = req.user.userId as string;
    if (body.fullName !== undefined) {
      await this.usersService.updateFullName(userId, body.fullName.trim() || null);
    }
    if (body.phone !== undefined) {
      await this.usersService.updatePhone(userId, body.phone.trim() || null);
    }
    if (body.email !== undefined) {
      await this.usersService.updateEmail(userId, body.email.trim() || null);
    }
    return { ok: true };
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

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Завершить все активные сессии пользователя'})
  async logoutAll(@Request() req: any) {
    await this.authService.logoutAllDevices(req.user.userId as string);
    return { message: 'Все сессии завершены' };
  }
}

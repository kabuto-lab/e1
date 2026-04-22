import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { ModelWizardService } from './model-wizard.service';
import { TelegramLinkTokenService } from '../auth/telegram-link-token.service';
import { Bot } from 'grammy';

const LINK_PREFIX = 'link_';
const TOKEN_REGEX = /^[a-f0-9]{64}$/i;

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot: Bot | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly wizardService: ModelWizardService,
    private readonly telegramLinkTokenService: TelegramLinkTokenService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
      return;
    }

    this.bot = new Bot(token);
    this.registerHandlers();

    this.bot.start({
      onStart: (info) => this.logger.log(`Bot started as @${info.username}`),
    }).catch((err) => this.logger.error('Bot crashed', err));
  }

  async onModuleDestroy() {
    await this.bot?.stop();
  }

  private registerHandlers() {
    if (!this.bot) return;

    this.bot.command('start', async (ctx) => {
      const chatId = ctx.chat.id;
      this.logger.log(`/start from chatId: ${chatId}`);

      // Web-first TG linking: /start link_<token> — открыто для всех пользователей
      const text = ctx.message?.text ?? '';
      const payload = text.split(/\s+/, 2)[1] ?? '';
      if (payload.startsWith(LINK_PREFIX)) {
        const token = payload.slice(LINK_PREFIX.length);
        if (!TOKEN_REGEX.test(token)) {
          await ctx.reply('Токен повреждён. Сгенерируй новый в Настройки → Telegram.');
          return;
        }
        try {
          const { userId } = await this.telegramLinkTokenService.consumeToken(token);
          await this.usersService.linkTelegramIdentity(userId, {
            telegramId: String(chatId),
            telegramUsername: ctx.from?.username ?? null,
            telegramLanguageCode: ctx.from?.language_code ?? null,
          });
          await ctx.reply(`✓ Готово! Telegram привязан к твоему аккаунту Lovnge.`);
        } catch (err: any) {
          if (err?.status === 400 || err?.message?.includes('invalid') || err?.message?.includes('expired')) {
            await ctx.reply('Токен просрочен или уже использован. Сгенерируй новый в ЛК → Настройки.');
          } else if (err?.status === 409) {
            await ctx.reply('Этот Telegram уже привязан к другому аккаунту.');
          } else {
            this.logger.error('link token consume failed', err);
            await ctx.reply('Не получилось привязать аккаунт. Попробуй ещё раз через минуту.');
          }
        }
        return;
      }

      const isAdmin = await this.checkAdmin(chatId);
      if (!isAdmin) {
        await ctx.reply(
          'Привет! Этот бот — для привязки аккаунта Lovnge и уведомлений.\n\n' +
            'Чтобы привязать аккаунт — войди на сайте, открой Настройки → Telegram и нажми «Привязать».',
        );
        return;
      }
      await ctx.reply(
        '👋 Добро пожаловать, администратор.\n\n' +
          'Команды:\n' +
          '/newmodel — добавить новую анкету модели\n' +
          '/cancel — отменить текущий ввод',
      );
    });

    this.bot.command('newmodel', async (ctx) => {
      const chatId = ctx.chat.id;
      const isAdmin = await this.checkAdmin(chatId);
      if (!isAdmin) {
        await ctx.reply('⛔ Доступ запрещён.');
        return;
      }
      const state = this.wizardService.start(chatId);
      await ctx.reply(this.wizardService.promptFor(state.step));
    });

    this.bot.command('cancel', async (ctx) => {
      this.wizardService.clear(ctx.chat.id);
      await ctx.reply('❌ Ввод отменён.');
    });

    // Photo handler
    this.bot.on('message:photo', async (ctx) => {
      const chatId = ctx.chat.id;
      const state = this.wizardService.get(chatId);
      if (!state || state.step !== 'photos') return;

      const photos = ctx.message.photo;
      const best = photos[photos.length - 1]; // highest resolution
      state.photoFileIds.push(best.file_id);
      await ctx.reply(`📸 Фото ${state.photoFileIds.length} сохранено. Ещё фото или напишите "готово".`);
    });

    // Text handler
    this.bot.on('message:text', async (ctx) => {
      const chatId = ctx.chat.id;
      const state = this.wizardService.get(chatId);
      if (!state) return;

      const text = ctx.message.text.trim();

      switch (state.step) {
        case 'name':
          if (!text || text.length < 2) {
            await ctx.reply('⚠️ Имя слишком короткое. Попробуйте ещё раз:');
            return;
          }
          state.displayName = text;
          state.step = 'slug';
          const suggested = await this.wizardService.suggestUniqueSlug(text);
          state.slug = suggested; // сохраняем предложение, чтобы "ок" взял его
          await ctx.reply(this.wizardService.promptFor('slug', suggested));
          break;

        case 'slug': {
          const raw = text.toLowerCase() === 'ок' || text.toLowerCase() === 'ok'
            ? state.slug! // уже сохранённое предложение
            : text.trim().toLowerCase();
          if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(raw)) {
            await ctx.reply('⚠️ Только латиница, цифры и дефис, минимум 3 символа, не начинается/не заканчивается дефисом. Попробуйте ещё раз:');
            return;
          }
          state.slug = raw;
          state.step = 'bio';
          await ctx.reply(this.wizardService.promptFor('bio'));
          break;
        }

        case 'bio':
          state.biography = text === '-' ? undefined : text;
          state.step = 'age';
          await ctx.reply(this.wizardService.promptFor('age'));
          break;

        case 'age': {
          const age = parseInt(text, 10);
          if (isNaN(age) || age < 18 || age > 80) {
            await ctx.reply('⚠️ Введите корректный возраст (18–80):');
            return;
          }
          state.age = age;
          state.step = 'height';
          await ctx.reply(this.wizardService.promptFor('height'));
          break;
        }

        case 'height': {
          const h = parseInt(text, 10);
          if (isNaN(h) || h < 140 || h > 210) {
            await ctx.reply('⚠️ Введите корректный рост (140–210 см):');
            return;
          }
          state.height = h;
          state.step = 'weight';
          await ctx.reply(this.wizardService.promptFor('weight'));
          break;
        }

        case 'weight': {
          const w = parseInt(text, 10);
          if (isNaN(w) || w < 35 || w > 150) {
            await ctx.reply('⚠️ Введите корректный вес (35–150 кг):');
            return;
          }
          state.weight = w;
          state.step = 'bust';
          await ctx.reply(this.wizardService.promptFor('bust'));
          break;
        }

        case 'bust':
          state.bustSize = text === '-' ? undefined : text;
          state.step = 'city';
          await ctx.reply(this.wizardService.promptFor('city'));
          break;

        case 'city':
          state.city = text === '-' ? undefined : text;
          state.step = 'rate_hourly';
          await ctx.reply(this.wizardService.promptFor('rate_hourly'));
          break;

        case 'rate_hourly': {
          if (text !== '-') {
            const rate = parseInt(text, 10);
            if (isNaN(rate) || rate < 0) {
              await ctx.reply('⚠️ Введите число или "-":');
              return;
            }
            state.rateHourly = rate;
          }
          state.step = 'rate_overnight';
          await ctx.reply(this.wizardService.promptFor('rate_overnight'));
          break;
        }

        case 'rate_overnight': {
          if (text !== '-') {
            const rate = parseInt(text, 10);
            if (isNaN(rate) || rate < 0) {
              await ctx.reply('⚠️ Введите число или "-":');
              return;
            }
            state.rateOvernight = rate;
          }
          state.step = 'photos';
          await ctx.reply(this.wizardService.promptFor('photos'));
          break;
        }

        case 'photos':
          if (text.toLowerCase() === 'готово') {
            if (state.photoFileIds.length === 0) {
              await ctx.reply('⚠️ Нужно хотя бы одно фото. Отправьте фото или /cancel для отмены.');
              return;
            }
            state.step = 'confirm';
            const summary = this.wizardService.buildSummary(state);
            await ctx.reply(this.wizardService.promptFor('confirm') + summary);
          } else {
            await ctx.reply('📸 Отправьте фото или напишите "готово" для завершения.');
          }
          break;

        case 'confirm': {
          if (text.toLowerCase() === 'да') {
            await ctx.reply('⏳ Публикую профиль...');
            const isAdmin = await this.checkAdmin(chatId);
            if (!isAdmin) {
              await ctx.reply('⛔ Ошибка прав.');
              this.wizardService.clear(chatId);
              return;
            }
            let adminUserId: string | undefined;
            const adminUser = await this.usersService.findByTelegramId(chatId);
            if (adminUser) {
              adminUserId = adminUser.id;
            } else {
              // Fallback: use the seeded admin account when chatId is env-whitelisted
              const fallback = await this.usersService.findByEmail(
                this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@lovnge.local',
              );
              adminUserId = fallback?.id;
            }
            if (!adminUserId) {
              await ctx.reply('⛔ Не удалось определить аккаунт администратора. Привяжите Telegram в настройках.');
              this.wizardService.clear(chatId);
              return;
            }
            try {
              const result = await this.wizardService.publish(state, adminUserId);
              this.wizardService.clear(chatId);
              await ctx.reply(
                `✅ Профиль опубликован!\n\nСлаг: ${result.slug}\nФото загружено: ${result.photosUploaded}`,
              );
            } catch (err: any) {
              this.logger.error('publish failed', err);
              await ctx.reply(`❌ Ошибка публикации: ${err.message}`);
            }
          } else if (text.toLowerCase() === 'нет') {
            this.wizardService.clear(chatId);
            await ctx.reply('❌ Отменено. Используйте /newmodel чтобы начать заново.');
          } else {
            await ctx.reply('Введите "да" для публикации или "нет" для отмены.');
          }
          break;
        }
      }
    });

    this.bot.catch((err) => {
      this.logger.error(`Bot error: ${err.message}`, err.stack);
    });
  }

  private async checkAdmin(chatId: number): Promise<boolean> {
    try {
      // Check env-based whitelist first (comma-separated chat IDs)
      const envIds = this.configService.get<string>('TELEGRAM_ADMIN_IDS') ?? '';
      if (envIds.split(',').map((s) => s.trim()).includes(String(chatId))) {
        return true;
      }
      const user = await this.usersService.findByTelegramId(chatId);
      return user?.role === 'admin' || user?.role === 'manager';
    } catch {
      return false;
    }
  }
}

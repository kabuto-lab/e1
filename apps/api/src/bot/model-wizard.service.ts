import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelsService } from '../models/models.service';
import { MediaService } from '../media/media.service';
import { MinioService } from '../profiles/minio.service';
import { WizardState, WizardStep } from './wizard.types';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import * as https from 'https';

@Injectable()
export class ModelWizardService {
  private readonly logger = new Logger(ModelWizardService.name);
  private readonly sessions = new Map<number, WizardState>();
  private readonly botToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly modelsService: ModelsService,
    private readonly mediaService: MediaService,
    private readonly minioService: MinioService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
  }

  start(chatId: number): WizardState {
    const state: WizardState = { step: 'name', photoFileIds: [] };
    this.sessions.set(chatId, state);
    return state;
  }

  get(chatId: number): WizardState | undefined {
    return this.sessions.get(chatId);
  }

  clear(chatId: number): void {
    this.sessions.delete(chatId);
  }

  /** Транслитерировать имя → slug-кандидат */
  suggestSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[её]/g, 'e')
      .replace(/[а]/g, 'a').replace(/[б]/g, 'b').replace(/[в]/g, 'v')
      .replace(/[г]/g, 'g').replace(/[д]/g, 'd').replace(/[ж]/g, 'zh')
      .replace(/[з]/g, 'z').replace(/[и]/g, 'i').replace(/[й]/g, 'y')
      .replace(/[к]/g, 'k').replace(/[л]/g, 'l').replace(/[м]/g, 'm')
      .replace(/[н]/g, 'n').replace(/[о]/g, 'o').replace(/[п]/g, 'p')
      .replace(/[р]/g, 'r').replace(/[с]/g, 's').replace(/[т]/g, 't')
      .replace(/[у]/g, 'u').replace(/[ф]/g, 'f').replace(/[х]/g, 'kh')
      .replace(/[ц]/g, 'ts').replace(/[ч]/g, 'ch').replace(/[ш]/g, 'sh')
      .replace(/[щ]/g, 'sch').replace(/[ъь]/g, '').replace(/[ы]/g, 'y')
      .replace(/[э]/g, 'e').replace(/[ю]/g, 'yu').replace(/[я]/g, 'ya')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** Найти свободный slug: если base занят — добавить -2, -3, … */
  async suggestUniqueSlug(name: string): Promise<string> {
    const base = this.suggestSlug(name) || 'model';
    if (!(await this.modelsService.findBySlug(base))) return base;
    for (let i = 2; i <= 99; i++) {
      const candidate = `${base}-${i}`;
      if (!(await this.modelsService.findBySlug(candidate))) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  promptFor(step: WizardStep, extra?: string): string {
    const siteUrl = this.configService.get<string>('NEXT_PUBLIC_SITE_URL') || 'https://lovnge.com';
    const prompts: Record<WizardStep, string> = {
      name: '📝 Введите имя модели (псевдоним):',
      slug: extra
        ? `🔗 Адрес анкеты на сайте:\n${siteUrl}/models/${extra}\n\nЕсли подходит — напишите "ок".\nИли введите свой вариант (только латиница, цифры, дефис):`
        : `🔗 Введите адрес анкеты (только латиница, цифры, дефис).\nНапример: anna-moscow\n\nАдрес будет: ${siteUrl}/models/ваш-вариант`,
      bio: '📄 Введите описание (биография). Отправьте "-" чтобы пропустить:',
      age: '🎂 Возраст (число, например 24):',
      height: '📏 Рост в см (например 168):',
      weight: '⚖️ Вес в кг (например 55):',
      bust: '👙 Размер груди (например 2 или 3C):',
      city: '🏙 Город (например Москва):',
      rate_hourly: '💰 Стоимость часа (число в USD, или "-" чтобы пропустить):',
      rate_overnight: '🌙 Стоимость ночи (число в USD, или "-" чтобы пропустить):',
      photos: '📸 Отправьте фотографии по одной. Когда закончите — напишите "готово":',
      confirm:
        '✅ Всё верно? Введите "да" для публикации или "нет" для отмены.\n\nСводка:\n',
    };
    return prompts[step];
  }

  buildSummary(state: WizardState): string {
    const siteUrl = this.configService.get<string>('NEXT_PUBLIC_SITE_URL') || 'https://lovnge.com';
    return [
      `Имя: ${state.displayName}`,
      `Адрес: ${siteUrl}/models/${state.slug}`,
      `Биография: ${state.biography || '—'}`,
      `Возраст: ${state.age ?? '—'}`,
      `Рост: ${state.height ?? '—'} см`,
      `Вес: ${state.weight ?? '—'} кг`,
      `Грудь: ${state.bustSize || '—'}`,
      `Город: ${state.city || '—'}`,
      `Цена/час: ${state.rateHourly ?? '—'} USD`,
      `Цена/ночь: ${state.rateOvernight ?? '—'} USD`,
      `Фото: ${state.photoFileIds.length} шт.`,
    ].join('\n');
  }

  /** Download file from Telegram → Buffer */
  private async downloadTelegramFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const apiBase = `https://api.telegram.org/bot${this.botToken}`;

    const fileInfo = await new Promise<{ file_path: string }>((resolve, reject) => {
      const url = `${apiBase}/getFile?file_id=${fileId}`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.ok) resolve(parsed.result);
            else reject(new Error(parsed.description));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const downloadUrl = `https://api.telegram.org/file/bot${this.botToken}/${fileInfo.file_path}`;
      https.get(downloadUrl, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });

    const ext = fileInfo.file_path.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    return { buffer, mimeType };
  }

  /** Upload photo to MinIO directly (server-side) */
  private async uploadToMinio(
    buffer: Buffer,
    mimeType: string,
    modelSlug: string,
    index: number,
  ): Promise<{ storageKey: string; cdnUrl: string }> {
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const storageKey = `models/${modelSlug}/photos/${Date.now()}-${index}.${ext}`;

    // Access private s3Client via MinioService internals — we do a direct upload
    // MinioService exposes getPublicUrl; for server-side upload we need a raw S3 client.
    // We construct our own S3 client here using the same env vars.
    const internalEndpoint =
      this.configService.get<string>('MINIO_ENDPOINT') || 'localhost:9000';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin';
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin';
    const bucket = this.configService.get<string>('MINIO_BUCKET') || 'escort-media';

    const s3 = new S3Client({
      region: 'us-east-1',
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      endpoint: `http://${internalEndpoint}`,
      forcePathStyle: true,
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const cdnUrl = this.minioService.getPublicUrl(storageKey);
    return { storageKey, cdnUrl };
  }

  /** Full publish: create model + upload all photos */
  async publish(
    state: WizardState,
    adminUserId: string,
  ): Promise<{ profileId: string; slug: string; photosUploaded: number }> {
    const slug = state.slug!;

    const profile = await this.modelsService.createFullProfile({
      displayName: state.displayName!,
      slug,
      biography: state.biography,
      physicalAttributes: {
        age: state.age,
        height: state.height,
        weight: state.weight,
        bustSize: state.bustSize,
        city: state.city,
      },
      rateHourly: state.rateHourly,
      rateOvernight: state.rateOvernight,
      managerId: adminUserId,
    });

    let photosUploaded = 0;
    for (let i = 0; i < state.photoFileIds.length; i++) {
      try {
        const { buffer, mimeType } = await this.downloadTelegramFile(state.photoFileIds[i]);
        const { storageKey, cdnUrl } = await this.uploadToMinio(buffer, mimeType, slug, i);

        const mediaFile = await this.mediaService.createFile({
          ownerId: adminUserId,
          modelId: profile.id,
          fileType: 'photo',
          storageKey,
          cdnUrl,
          mimeType,
          fileSize: buffer.length,
        });

        await this.mediaService.approve(mediaFile.id);

        if (i === 0) {
          await this.modelsService.setMainPhoto(profile.id, cdnUrl);
        }

        photosUploaded++;
      } catch (err) {
        this.logger.error(`Failed to upload photo ${i}: ${err}`);
      }
    }

    return { profileId: profile.id, slug, photosUploaded };
  }
}

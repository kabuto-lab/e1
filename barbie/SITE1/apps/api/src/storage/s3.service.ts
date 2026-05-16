/**
 * S3Service — низкоуровневая обёртка над AWS SDK v3 для MinIO (dev) / S3 (prod).
 *
 * Принципы:
 *   - КЛЮЧИ tenant-aware: `tenant/{tenantId}/{module}/{filename}` — формирует MediaService.
 *   - В этом сервисе тенант-логики НЕТ. Этот слой просто говорит "put bytes by key" /
 *     "get presigned URL". TenantId-валидация — на уровне MediaService.
 *   - dev (MinIO): forcePathStyle=true, anonymous download разрешён на bucket (см. compose).
 *   - prod (S3): forcePathStyle=false, объекты приватные, отдача через presigned URLs.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service implements OnModuleDestroy {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('s3.endpoint');
    const region = config.get<string>('s3.region') ?? 'us-east-1';
    const accessKeyId = config.get<string>('s3.accessKey') ?? '';
    const secretAccessKey = config.get<string>('s3.secretKey') ?? '';
    this.bucket = config.get<string>('s3.bucket') ?? '';
    this.publicUrl = config.get<string>('s3.publicUrl') ?? '';
    const forcePathStyle = config.get<boolean>('s3.forcePathStyle') ?? true;

    if (!this.bucket) throw new Error('S3_BUCKET is not configured');

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });
    this.logger.log(`S3 initialized: bucket=${this.bucket}, endpoint=${endpoint}`);
  }

  /** Положить объект (multipart-загруженный буфер). */
  async putObject(args: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
    cacheControl?: string;
  }): Promise<void> {
    const input: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
      Metadata: args.metadata,
      CacheControl: args.cacheControl ?? 'public, max-age=2592000', // 30 дней
    };
    await this.client.send(new PutObjectCommand(input));
  }

  /** Удалить объект (best-effort — не бросает если ключа нет). */
  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err: any) {
      this.logger.warn(`deleteObject failed for ${key}: ${err?.message ?? err}`);
    }
  }

  /** Проверить существование (HEAD). */
  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  /** Публичный URL (MinIO в dev отдаёт anonymous download). */
  publicUrlFor(key: string): string {
    return `${this.publicUrl.replace(/\/$/, '')}/${encodeURI(key)}`;
  }

  /** Подписанная ссылка для GET (для приватных бакетов в prod). TTL по умолчанию 1 час. */
  async signedDownloadUrl(key: string, expiresSec = 3600): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresSec,
    });
  }

  /** Подписанная ссылка для PUT — для будущего presigned-upload flow (Phase 1 опционально). */
  async signedUploadUrl(args: {
    key: string;
    contentType: string;
    expiresSec?: number;
  }): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: args.key,
        ContentType: args.contentType,
      }),
      { expiresIn: args.expiresSec ?? 900 },
    );
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}

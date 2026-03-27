/**
 * MinIO Service - Presigned URL generation for direct file uploads
 * Works with S3-compatible storage (MinIO, AWS S3, etc.)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MinioService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private configService: ConfigService) {
    // Use optional chaining for safety
    const endpoint = configService?.get?.<string>('MINIO_ENDPOINT') || 'localhost:9000';
    const accessKey = configService?.get?.<string>('MINIO_ACCESS_KEY') || 'minioadmin';
    const secretKey = configService?.get?.<string>('MINIO_SECRET_KEY') || 'minioadmin';
    this.bucket = configService?.get?.<string>('MINIO_BUCKET') || 'escort-media';
    this.publicUrl = configService?.get?.<string>('MINIO_PUBLIC_URL') || `http://${endpoint}`;

    this.s3Client = new S3Client({
      endpoint: `http://${endpoint}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });

    this.logger.log(`MinIO initialized: ${endpoint}/${this.bucket}`);
  }

  /**
   * Generate presigned URL for PUT (upload)
   * Client uploads directly to MinIO using this URL
   */
  async generateUploadUrl(
    fileName: string,
    mimeType: string,
    fileSize: number,
  ): Promise<{
    uploadUrl: string;
    storageKey: string;
    cdnUrl: string;
    expiresAt: Date;
  }> {
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storageKey = `uploads/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    const cdnUrl = `${this.publicUrl}/${this.bucket}/${storageKey}`;
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    this.logger.debug(`Generated upload URL for ${storageKey}`);

    return {
      uploadUrl,
      storageKey,
      cdnUrl,
      expiresAt,
    };
  }

  /**
   * Generate presigned URL for GET (download/view)
   */
  async getViewUrl(storageKey: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Get public CDN URL (no auth required)
   */
  getPublicUrl(storageKey: string): string {
    return `${this.publicUrl}/${this.bucket}/${storageKey}`;
  }

  /**
   * Delete file from MinIO
   */
  async deleteFile(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    await this.s3Client.send(command);
    this.logger.log(`Deleted file: ${storageKey}`);
  }

  /**
   * Move file from uploads/ to final location
   */
  async finalizeUpload(
    fromStorageKey: string,
    toStorageKey: string,
  ): Promise<{ cdnUrl: string }> {
    // For now, just return the CDN URL
    // In production, you might want to actually move/copy the object
    const cdnUrl = this.getPublicUrl(toStorageKey);
    return { cdnUrl };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to list objects (minimal permission required)
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: '.healthcheck',
          Body: Buffer.from('ok'),
        }),
      );
      return true;
    } catch (error) {
      this.logger.error('MinIO health check failed', error);
      return false;
    }
  }
}

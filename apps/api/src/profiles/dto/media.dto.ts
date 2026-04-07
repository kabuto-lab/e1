/**
 * Media DTOs
 * Validation for media file operations
 */

import {
  IsString,
  IsEnum,
  IsIn,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
  Max,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

const PRESIGN_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/webm',
] as const;

export class GeneratePresignedUrlDto {
  @IsString()
  fileName: string;

  @IsIn(PRESIGN_MIME as unknown as string[])
  mimeType: (typeof PRESIGN_MIME)[number];

  @IsNumber()
  @Min(1)
  @Max(104857600) // 100MB max
  fileSize: number;

  @IsOptional()
  @IsUUID()
  modelId?: string;
}

export class ConfirmUploadDto {
  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true })
  cdnUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    originalName?: string;
  };

  @IsOptional()
  @IsUUID()
  modelId?: string;
}

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true })
  cdnUrl?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ModerateMediaDto {
  @IsString()
  @IsEnum(['approved', 'rejected'])
  moderationStatus: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  moderationReason?: string;
}

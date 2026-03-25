/**
 * Media DTOs
 * Validation for media file operations
 */

import {
  IsString,
  IsEnum,
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

export class GeneratePresignedUrlDto {
  @IsString()
  fileName: string;

  @IsString()
  @IsEnum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/webm';

  @IsNumber()
  @Min(1024)
  @Max(104857600) // 100MB max
  fileSize: number;

  @IsOptional()
  @IsUUID()
  modelId?: string;
}

export class ConfirmUploadDto {
  @IsString()
  storageKey: string;

  @IsOptional()
  @IsString()
  @IsUrl()
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
  @IsUrl()
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

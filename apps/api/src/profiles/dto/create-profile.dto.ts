/**
 * Create Profile DTO
 * Validation for creating a new model profile
 */

import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  IsArray,
  MaxLength,
  MinLength,
  Min,
  IsUrl,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PhysicalAttributesDto {
  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  bustSize?: number;

  @IsOptional()
  @IsEnum(['natural', 'silicone'])
  bustType?: 'natural' | 'silicone';

  @IsOptional()
  @IsEnum(['slim', 'curvy', 'bbw', 'pear', 'fit'])
  bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';

  @IsOptional()
  @IsEnum(['gentle', 'active', 'adaptable'])
  temperament?: 'gentle' | 'active' | 'adaptable';

  @IsOptional()
  @IsEnum(['active', 'passive', 'universal'])
  sexuality?: 'active' | 'passive' | 'universal';

  @IsOptional()
  @IsString()
  hairColor?: string;

  @IsOptional()
  @IsString()
  eyeColor?: string;
}

export class CreateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  biography?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhysicalAttributesDto)
  physicalAttributes?: PhysicalAttributesDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  psychotypeTags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  rateHourly?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rateOvernight?: number;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  biography?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhysicalAttributesDto)
  physicalAttributes?: PhysicalAttributesDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  psychotypeTags?: string[];

  @IsOptional()
  @IsString()
  rateHourly?: string;

  @IsOptional()
  @IsString()
  rateOvernight?: string;

  @IsOptional()
  @IsEnum(['offline', 'online', 'in_shift', 'busy'])
  availabilityStatus?: 'offline' | 'online' | 'in_shift' | 'busy';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl()
  mainPhotoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class PublishProfileDto {
  @IsBoolean()
  isPublished: boolean;
}

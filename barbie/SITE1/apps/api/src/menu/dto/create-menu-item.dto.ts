import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class MenuItemPayloadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 160)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 60)
  badge?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  highlight?: boolean;
}

export class CreateMenuItemDto {
  @ApiPropertyOptional({ description: 'Parent menu item id (null = top-level)' })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  label!: string;

  @ApiProperty({ description: 'URL or relative path. Must start with "/" or "http(s)://"' })
  @IsString()
  @Length(1, 1000)
  @Matches(/^(\/|https?:\/\/)/, { message: 'href must start with "/" or "http(s)://"' })
  href!: string;

  @ApiPropertyOptional({ description: 'S3 key for menu image (mega-images template)' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  imageKey?: string;

  @ApiPropertyOptional({ description: 'Icon name (lucide-react subset, vertical-side template)' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  icon?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: 'ru' })
  @IsOptional()
  @IsString()
  @Length(2, 8)
  locale?: string;

  @ApiPropertyOptional({ enum: ['active', 'hidden', 'archived'], default: 'active' })
  @IsOptional()
  @IsIn(['active', 'hidden', 'archived'])
  status?: 'active' | 'hidden' | 'archived';

  @ApiPropertyOptional({ type: MenuItemPayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MenuItemPayloadDto)
  payload?: MenuItemPayloadDto;
}

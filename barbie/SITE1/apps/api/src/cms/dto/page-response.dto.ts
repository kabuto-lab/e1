import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: ['ru', 'en'] }) locale!: 'ru' | 'en';
  @ApiProperty() title!: string;
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  body!: unknown[];
  @ApiProperty({ enum: ['draft', 'published', 'archived'] })
  status!: 'draft' | 'published' | 'archived';
  @ApiPropertyOptional() metaTitle?: string | null;
  @ApiPropertyOptional() metaDescription?: string | null;
  @ApiPropertyOptional() coverImageKey?: string | null;
  @ApiPropertyOptional() authorUserId?: string | null;
  @ApiPropertyOptional({ format: 'date-time' }) publishedAt?: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ListPagesResponseDto {
  @ApiProperty({ type: [PageResponseDto] }) data!: PageResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}

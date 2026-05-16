import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MediaResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'S3 key — `tenant/{tenantId}/{module}/{filename}`' }) key!: string;
  @ApiProperty({ description: 'Public download URL (MinIO в dev) или подписанная ссылка' })
  url!: string;
  @ApiProperty() mime!: string;
  @ApiProperty({ description: 'Размер в байтах, как строка (BigInt-safe)' }) size!: string;
  @ApiPropertyOptional() sha256?: string | null;
  @ApiPropertyOptional() width?: number | null;
  @ApiPropertyOptional() height?: number | null;
  @ApiProperty() module!: string;
  @ApiPropertyOptional() entityId?: string | null;
  @ApiPropertyOptional() alt?: string | null;
  @ApiPropertyOptional() caption?: string | null;
  @ApiProperty({ enum: ['uploading', 'ready', 'archived'] })
  status!: 'uploading' | 'ready' | 'archived';
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class ListMediaResponseDto {
  @ApiProperty({ type: [MediaResponseDto] })
  data!: MediaResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}

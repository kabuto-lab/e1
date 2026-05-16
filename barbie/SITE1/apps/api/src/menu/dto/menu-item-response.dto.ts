import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiPropertyOptional({ nullable: true }) parentId?: string | null;
  @ApiProperty() label!: string;
  @ApiProperty() href!: string;
  @ApiPropertyOptional({ nullable: true }) imageKey?: string | null;
  @ApiPropertyOptional({ nullable: true }) icon?: string | null;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() locale!: string;
  @ApiProperty({ enum: ['active', 'hidden', 'archived'] })
  status!: 'active' | 'hidden' | 'archived';
  @ApiPropertyOptional({ type: Object })
  payload?: {
    description?: string;
    badge?: string;
    openInNewTab?: boolean;
    highlight?: boolean;
  } | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class MenuTreeItemDto extends MenuItemResponseDto {
  @ApiProperty({ type: [MenuTreeItemDto], default: [] })
  children!: MenuTreeItemDto[];
}

export class PublicMenuResponseDto {
  @ApiProperty({ enum: ['top-classic', 'mega-images', 'vertical-side'] })
  template!: 'top-classic' | 'mega-images' | 'vertical-side';

  @ApiProperty({ type: [MenuTreeItemDto] })
  items!: MenuTreeItemDto[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelMemberDto {
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() name?: string | null;
  @ApiPropertyOptional() email?: string | null;
  @ApiProperty({ enum: ['member', 'admin'] })
  role!: 'member' | 'admin';
  @ApiPropertyOptional() lastReadAt?: string | null;
  @ApiProperty() muted!: boolean;
  @ApiProperty() joinedAt!: string;
}

export class ChannelResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty({ enum: ['dm', 'group'] })
  type!: 'dm' | 'group';
  @ApiPropertyOptional() title?: string | null;
  @ApiPropertyOptional() salonId?: string | null;
  @ApiProperty() createdBy!: string;
  @ApiPropertyOptional() lastMessageAt?: string | null;
  @ApiPropertyOptional() archivedAt?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ type: [ChannelMemberDto] }) members!: ChannelMemberDto[];
  @ApiProperty({ description: 'Count of messages with created_at > caller.last_read_at' })
  unreadCount!: number;
}

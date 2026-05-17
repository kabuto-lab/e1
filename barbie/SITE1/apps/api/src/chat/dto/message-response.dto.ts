import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageAttachmentResponseDto {
  @ApiProperty() mediaKey!: string;
  @ApiProperty() mime!: string;
  @ApiProperty() size!: number;
  @ApiProperty() name!: string;
}

export class MessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() channelId!: string;
  @ApiProperty() authorUserId!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ type: [MessageAttachmentResponseDto] })
  attachments!: MessageAttachmentResponseDto[];
  @ApiPropertyOptional() replyToMessageId?: string | null;
  @ApiPropertyOptional() editedAt?: string | null;
  @ApiPropertyOptional() deletedAt?: string | null;
  @ApiProperty() createdAt!: string;
}

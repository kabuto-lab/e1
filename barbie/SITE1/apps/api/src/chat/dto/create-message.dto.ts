import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ChatAttachmentDto {
  @ApiProperty({ description: 'S3 key returned by /v1/media/presign' })
  @IsString()
  @Length(1, 500)
  mediaKey!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 128)
  mime!: string;

  @ApiProperty({ description: 'Bytes' })
  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024)
  size!: number;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name!: string;
}

export class CreateMessageDto {
  @ApiProperty({ description: 'Plain text / markdown subset' })
  @IsString()
  @Length(1, 8000)
  body!: string;

  @ApiPropertyOptional({ type: [ChatAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];

  @ApiPropertyOptional({ description: 'Reply target — must belong to the same channel' })
  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;
}

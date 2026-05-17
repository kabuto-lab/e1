import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({ enum: ['dm', 'group'] })
  @IsIn(['dm', 'group'])
  type!: 'dm' | 'group';

  @ApiPropertyOptional({ description: 'Required for group, must be null for dm' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @ApiPropertyOptional({ description: 'Optional salon scope for group channels' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiProperty({
    description:
      'Members (tenant_users.user_id). For dm — exactly 1 other user (caller is added automatically). For group — 1..50.',
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  memberIds!: string[];
}

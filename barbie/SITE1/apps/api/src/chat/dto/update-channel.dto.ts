import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateChannelDto {
  @ApiPropertyOptional({ description: 'Rename group (ignored for dm)' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @ApiPropertyOptional({ description: 'Archive / unarchive' })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

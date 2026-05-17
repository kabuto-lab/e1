import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class UpdateMessageDto {
  @ApiProperty()
  @IsString()
  @Length(1, 8000)
  body!: string;
}

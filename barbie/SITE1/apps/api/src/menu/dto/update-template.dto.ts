import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateNavTemplateDto {
  @ApiProperty({ enum: ['top-classic', 'mega-images', 'vertical-side'] })
  @IsIn(['top-classic', 'mega-images', 'vertical-side'])
  navTemplate!: 'top-classic' | 'mega-images' | 'vertical-side';
}

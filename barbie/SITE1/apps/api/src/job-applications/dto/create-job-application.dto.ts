import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Заявка «Хочешь работать у нас?» с публичной формы тенанта.
 * Фото приходят отдельным multipart-полем `photos` (см. контроллер), не в DTO.
 */
export class CreateJobApplicationDto {
  @ApiProperty({ description: 'ФИО', example: 'Иванова Анна Петровна' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  @ApiProperty({ description: 'Контакты (телефон / Telegram / WhatsApp / email)', example: '+7 999 123-45-67, @anna' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  contact!: string;

  @ApiPropertyOptional({ description: 'Сообщение / о себе', example: 'Опыт работы 2 года...' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ description: 'Slug тенанта, с сайта которого пришла заявка', example: 'nebesaspa' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tenantSlug?: string;
}

import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactMessageDto {
  @ApiProperty({ example: 'Иван', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'client@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Здравствуйте, хочу уточнить...', minLength: 10, maxLength: 5000 })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;

  /** Тема обращения с формы поддержки («Оплата», «Отмена или спор» и т.п.) — попадает в тему письма. */
  @ApiPropertyOptional({ example: 'Оплата', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  subject?: string;

  /** Необязательный номер бронирования — помогает поддержке найти сделку. */
  @ApiPropertyOptional({ example: 'B-1042', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  bookingNumber?: string;
}

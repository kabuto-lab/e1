import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

/**
 * Полный новый порядок моделей: массив id в нужной последовательности.
 * Сервис проставит ord = index. Порядок глобальный (Class-G) → отражается на
 * всех сайтах всех тенантов (публичная выдача сортируется по ord).
 */
export class ReorderGirlsDto {
  @ApiProperty({ type: [String], description: 'id моделей в новом порядке' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids!: string[];
}

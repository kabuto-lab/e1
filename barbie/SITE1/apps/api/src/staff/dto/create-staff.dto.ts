/**
 * CreateStaffDto — payload для создания мастера.
 *
 * Связи:
 *   - `salonId` обязательный, должен принадлежать текущему тенанту (сервис проверяет).
 *   - `userId` опциональный — мастер может работать без учётной записи (тогда
 *     личные данные лежат в `staff.name/bio`, но в систему он не входит). Если
 *     передан — должен существовать `tenant_users` с этим userId внутри тенанта.
 *   - `serviceIds` — список услуг, которые делает мастер; сервис вставит строки
 *     в `staff_services` (M2M) одной транзакцией с самим staff.
 *
 * Поля:
 *   - `specialties` — массив строк-категорий (jsonb в БД); не путать с
 *     `serviceIds` (это конкретные id записей `services`).
 *   - `schedule` — `StaffSchedule` объект (jsonb), валидация структуры пока
 *     минимальная (IsObject). Полную JSON-схему вводим в Phase 1 (см. ENTITY).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { StaffSchedule } from '@barbie-site1/db';

export class CreateStaffDto {
  @ApiProperty({
    description: 'Салон, в котором работает мастер (должен принадлежать текущему тенанту).',
    format: 'uuid',
  })
  @IsUUID()
  salonId!: string;

  @ApiPropertyOptional({
    description:
      'Связанный user (если мастер имеет логин). Должен числиться в tenant_users этого тенанта.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ minLength: 2, maxLength: 255, example: 'Анна Иванова' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Свободный текст-описание мастера.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string;

  @ApiPropertyOptional({
    description: 'S3 key фотографии (без bucket prefix).',
    example: 'tenants/aurelia/staff/anna.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoKey?: string;

  @ApiPropertyOptional({
    description: 'Массив категорий/тегов (text[] / jsonb), например ["hair", "color"].',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  specialties?: string[];

  @ApiPropertyOptional({
    description:
      'Недельное расписание + exceptions (StaffSchedule). Phase 0 — валидируем только тип object.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  schedule?: StaffSchedule;

  @ApiPropertyOptional({
    description:
      'Список service.id, которые делает мастер. Сервис проверит принадлежность тенанту и вставит в staff_services.',
    type: [String],
    format: 'uuid',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  serviceIds?: string[];
}

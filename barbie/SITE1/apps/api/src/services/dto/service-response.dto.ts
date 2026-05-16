/**
 * ServiceResponseDto — наружу.
 *
 * `priceKopecks` отдаём как **string**: bigint не сериализуется JSON.stringify
 * (TypeError: Do not know how to serialize a BigInt). Клиент при необходимости
 * парсит в BigInt / Number — но строка не теряет точность даже для очень крупных сумм.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ServiceStatus } from '@barbie-site1/db';

export class ServiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiPropertyOptional({ nullable: true }) salonId!: string | null;

  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;

  @ApiProperty() category!: string;
  @ApiProperty({ example: 60 }) durationMin!: number;

  @ApiProperty({
    description: 'Цена в копейках, строка (BigInt-safe сериализация).',
    example: '150000',
  })
  priceKopecks!: string;

  @ApiProperty({ example: 'RUB' }) currency!: string;

  @ApiPropertyOptional({ nullable: true }) coverImageKey!: string | null;

  @ApiProperty({ enum: ['active', 'draft', 'archived'] })
  status!: ServiceStatus;

  @ApiProperty() sortOrder!: number;

  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListServicesResponseDto {
  @ApiProperty({ type: [ServiceResponseDto] })
  data!: ServiceResponseDto[];

  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}

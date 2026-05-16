import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({
    description: 'URL-safe slug (3-40 символов, lowercase, цифры, дефисы)',
    example: 'aurelia-spa',
    minLength: 3,
    maxLength: 40,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/, {
    message: 'slug должен быть lowercase + цифры + дефисы, не начинаться/заканчиваться дефисом',
  })
  slug!: string;

  @ApiProperty({ example: 'Aurelia Spa Group', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  // === Первый tenant-admin (создаётся в той же транзакции) ===

  @ApiProperty({
    description: 'Email первого tenant-admin',
    example: 'admin@aurelia.com',
    format: 'email',
  })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ description: 'Пароль (хэшируется bcrypt)', minLength: 8 })
  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @ApiPropertyOptional({ description: 'Имя первого админа' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  adminName?: string;

  @ApiPropertyOptional({
    description: 'Custom primary domain (без https://), если есть',
    example: 'aurelia.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryDomain?: string;
}

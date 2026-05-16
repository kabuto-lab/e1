import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@barbie-site1.local', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token (короткоживущий)' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT refresh token (длинноживущий, используется для /auth/refresh)' })
  refreshToken!: string;

  @ApiProperty({ description: 'Срок жизни access token в секундах', example: 900 })
  expiresIn!: number;

  @ApiProperty({ enum: ['tenant', 'platform'] })
  kind!: 'tenant' | 'platform';

  @ApiProperty({ example: 'tenant-admin' })
  role!: string;

  @ApiProperty({ example: 'admin@aurelia.com' })
  email!: string;
}

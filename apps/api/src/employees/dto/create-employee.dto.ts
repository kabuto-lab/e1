import { IsString, MinLength, Matches, IsOptional, MaxLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_.]{3,32}$/, { message: 'Логин: 3-32 символа, латиница/цифры/"_"/"."' })
  login: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, {
    message: 'Пароль: минимум 8 символов, буквы и цифры',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;
}

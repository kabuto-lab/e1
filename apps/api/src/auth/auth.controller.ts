/**
 * Auth Controller - endpoints для регистрации и входа
 */

import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';

// DTOs
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ required: false, enum: ['client', 'model', 'admin'] })
  role?: 'client' | 'model' | 'admin';
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  refreshToken: string;
}

// JWT Guard placeholder
class JwtAuthGuard {
  canActivate(@Request() req) {
    // TODO: Implement real JWT validation
    req.user = { userId: 'demo-user-id', role: 'client' };
    return true;
  }
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({ status: 201, description: 'Успешная регистрация' })
  @ApiResponse({ status: 409, description: 'Email уже занят' })
  async register(@Body() body: RegisterDto) {
    try {
      if (!body.email || !body.password) {
        throw new UnauthorizedException('Email and password are required');
      }

      if (body.password.length < 8) {
        throw new UnauthorizedException('Password must be at least 8 characters');
      }

      return await this.authService.register(body.email, body.password, body.role);
    } catch (error: any) {
      console.error('Register error:', error);
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  @ApiResponse({ status: 401, description: 'Неверные учётные данные' })
  async login(@Body() body: any) {
    try {
      console.log('Login attempt with body:', body);
      console.log('Email:', body.email);
      console.log('Password:', body.password ? '***' : 'undefined');
      
      // Manual validation
      if (!body.email) {
        console.error('Missing email');
        throw new UnauthorizedException('Email is required');
      }
      if (!body.password) {
        console.error('Missing password');
        throw new UnauthorizedException('Password is required');
      }

      return await this.authService.login(body.email, body.password);
    } catch (error: any) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить токены' })
  @ApiResponse({ status: 200, description: 'Токены обновлены' })
  @ApiResponse({ status: 401, description: 'Невалидный refresh токен' })
  async refresh(@Body() body: RefreshTokenDto) {
    // Extract userId from refreshToken (simplified - in production use proper validation)
    const tokens = await this.authService.refreshTokens('', body.refreshToken);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выход из системы' })
  async logout(@Request() req) {
    // TODO: Add token to blacklist
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить текущий профиль' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  async getProfile(@Request() req) {
    return req.user;
  }
}

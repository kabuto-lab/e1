/**
 * @Public() — пропустить JwtAuthGuard для конкретного handler/контроллера.
 * Используется на /auth/login, /health, публичные tenant-сайт-эндпоинты.
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * @CurrentUser() — параметр-декоратор, возвращает AuthenticatedUser из req.user
 * (заполняется JwtStrategy).
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/jwt-payload';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | null => {
    const req = ctx.switchToHttp().getRequest();
    return (req.user as AuthenticatedUser) ?? null;
  },
);

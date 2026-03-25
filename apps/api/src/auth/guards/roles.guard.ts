/**
 * RBAC (Role-Based Access Control) Guard
 * 
 * Features:
 * - Role hierarchy: ADMIN > MANAGER > MODEL > CLIENT
 * - Resource ownership validation
 * - Fine-grained permission control
 * - Works in combination with JwtAuthGuard
 * 
 * @example
 * @Controller('profiles')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * export class ProfilesController {
 *   @Post()
 *   @Roles(Role.MANAGER, Role.ADMIN)
 *   async createProfile() { }
 *   
 *   @Get('my-profile')
 *   @Roles(Role.MODEL)
 *   async getMyProfile(@Req() req: RequestWithUser) { }
 * }
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from './jwt-auth.guard';

/**
 * User roles with hierarchy levels
 */
export enum Role {
  CLIENT = 'client',
  MODEL = 'model',
  MANAGER = 'manager',
  ADMIN = 'admin',
}

/**
 * Role hierarchy map (higher number = more privileges)
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.CLIENT]: 1,
  [Role.MODEL]: 2,
  [Role.MANAGER]: 3,
  [Role.ADMIN]: 4,
};

/**
 * Metadata key for roles decorator
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator — specify which roles can access the route
 * 
 * @usage
 * @Roles(Role.ADMIN) // Only admins
 * @Roles(Role.MANAGER, Role.ADMIN) // Managers or admins
 * @Roles(Role.MODEL, Role.MANAGER, Role.ADMIN) // MODEL+
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Resource ownership decorator — check if user owns the resource
 * 
 * @usage
 * @Resource('profile')
 * @Roles(Role.MODEL)
 * async updateProfile(@Param('id') id: string) { }
 */
export const RESOURCE_KEY = 'resource';
export const Resource = (resource: string) => SetMetadata(RESOURCE_KEY, resource);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles required — public endpoint
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request['user'];

    // User not authenticated (JwtAuthGuard should have caught this)
    if (!user || !user.role) {
      throw new ForbiddenException('User role not determined');
    }

    // Check if user role is in the allowed roles
    const userRole = user.role as Role;
    const hasRole = requiredRoles.some(role => role === userRole);

    if (!hasRole) {
      // Check role hierarchy — allow if user has higher role
      const userLevel = ROLE_HIERARCHY[userRole];
      const maxRequiredLevel = Math.max(
        ...requiredRoles.map(role => ROLE_HIERARCHY[role])
      );
      const minRequiredLevel = Math.min(
        ...requiredRoles.map(role => ROLE_HIERARCHY[role])
      );

      // If user level is higher than all required levels, allow
      if (userLevel >= maxRequiredLevel) {
        return true;
      }

      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredRoles.join(' or ')}, Current: ${userRole}`
      );
    }

    // Additional resource ownership check for MODEL/CLIENT roles
    const resource = this.reflector.getAllAndOverride<string>(RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (resource && (userRole === Role.MODEL || userRole === Role.CLIENT)) {
      const resourceId = request.params.id || request.body.profileId || request.body.modelId;

      if (resourceId) {
        // Ownership validation is done in the service layer
        // Here we just mark the request for service to check
        request['ownerCheck'] = {
          userId: user.userId,
          resource,
          resourceId,
          userRole,
        };
      }
    }

    return true;
  }
}

/**
 * Helper function to check if user has required role
 * Can be used in services for additional validation
 */
export function hasRole(userRole: Role, requiredRoles: Role[]): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  const maxRequiredLevel = Math.max(...requiredRoles.map(r => ROLE_HIERARCHY[r]));
  return userLevel >= maxRequiredLevel;
}

/**
 * Helper function to check if user can access resource
 */
export function canAccessResource(
  userRole: Role,
  resourceOwnerUserId: string,
  currentUserId: string
): boolean {
  // Admins can access everything
  if (userRole === Role.ADMIN) return true;

  // Managers can access models and clients
  if (userRole === Role.MANAGER) return true;

  // Models and clients can only access their own resources
  return resourceOwnerUserId === currentUserId;
}

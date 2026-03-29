# 🔐 Security Guards — Quick Reference

## JWT Authentication Guard

### Basic Usage (Protected Route)
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Controller('profiles')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class ProfilesController {
  @Get('my-profile')
  async getMyProfile(@Req() req: RequestWithUser) {
    // req.user.userId, req.user.role available
    return this.service.findByUserId(req.user.userId);
  }
}
```

### Optional Authentication (Works with or without token)
```typescript
import { OptionalJwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Controller('catalog')
@UseGuards(OptionalJwtAuthGuard) // Works for guests and authenticated users
export class CatalogController {
  @Get()
  async getCatalog(@Req() req: RequestWithUser) {
    // req.user exists if logged in, undefined otherwise
    const userId = req.user?.userId;
    return this.service.getCatalog({ userId });
  }
}
```

### Public Routes (Bypass Authentication)
```typescript
import { Public } from './auth/guards/jwt-auth.guard';

@Controller('health')
export class HealthController {
  @Get()
  @Public() // Bypasses JwtAuthGuard
  async healthCheck() {
    return { status: 'ok' };
  }
}
```

---

## RBAC Roles Guard

### Role-Based Access
```typescript
import { Roles } from './auth/guards/roles.guard';

@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfilesController {
  
  // Only managers and admins can create
  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  async createProfile(@Body() dto: CreateProfileDto) { }
  
  // Only model can access own profile
  @Get('my-profile')
  @Roles(Role.MODEL)
  async getMyProfile(@Req() req: RequestWithUser) { }
  
  // Admin only
  @Delete(':id')
  @Roles(Role.ADMIN)
  async deleteProfile(@Param('id') id: string) { }
}
```

### Role Hierarchy
```
ADMIN (level 4) — Full access
  ↓
MANAGER (level 3) — Can access MODEL + CLIENT routes
  ↓
MODEL (level 2) — Can access CLIENT routes
  ↓
CLIENT (level 1) — Basic access only
```

### Example: Hierarchical Access
```typescript
// This allows ADMIN, MANAGER, and MODEL
@Roles(Role.MODEL)
@Get('dashboard')
async getDashboard(@Req() req: RequestWithUser) {
  // ADMIN and MANAGER can also access this
}

// This allows only ADMIN
@Roles(Role.ADMIN)
@Get('admin/stats')
async getAdminStats() { }
```

---

## Combined Usage Pattern

### Full Example Controller
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, Public } from './auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from './auth/guards/roles.guard';

@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard) // Apply to all routes
export class ProfilesController {
  
  // PUBLIC: Anyone can view published catalog
  @Get()
  @Public()
  async getCatalog(@Query() filters: CatalogFiltersDto) {
    return this.service.getCatalog(filters);
  }
  
  // PUBLIC: View single profile by slug
  @Get('slug/:slug')
  @Public()
  async getProfileBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
  
  // MODEL+: View own profile
  @Get('me')
  @Roles(Role.MODEL)
  async getMyProfile(@Req() req: RequestWithUser) {
    return this.service.findByUserId(req.user.userId);
  }
  
  // MANAGER+: Create new profile
  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  async createProfile(
    @Body() dto: CreateProfileDto,
    @Req() req: RequestWithUser,
  ) {
    // Managers can create profiles for models
    return this.service.createProfile(null, dto);
  }
  
  // MODEL+: Update own profile
  @Put(':id')
  @Roles(Role.MODEL, Role.MANAGER, Role.ADMIN)
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: RequestWithUser,
  ) {
    // Check ownership in service
    return this.service.updateProfile(id, dto, req.user.userId);
  }
  
  // ADMIN ONLY: Delete profile
  @Delete(':id')
  @Roles(Role.ADMIN)
  async deleteProfile(@Param('id') id: string) {
    return this.service.deleteProfile(id);
  }
  
  // ADMIN ONLY: Approve media
  @Put('media/:id/approve')
  @Roles(Role.ADMIN, Role.MANAGER)
  async approveMedia(@Param('id') mediaId: string) {
    return this.service.approveMedia(mediaId);
  }
}
```

---

## RequestWithUser Interface

### Access User Context
```typescript
interface RequestWithUser {
  user?: {
    userId: string;      // User ID from JWT
    email: string;       // User email
    role: Role;          // User role
    sessionId: string;   // JWT session ID
    iat: number;         // Token issued at
    exp: number;         // Token expires at
  };
}
```

### Usage in Service Layer
```typescript
@Injectable()
export class ProfilesService {
  async updateProfile(
    id: string,
    updates: UpdateProfileDto,
    currentUserId: string,
  ): Promise<ModelProfile> {
    // Check ownership
    const profile = await this.findById(id);
    
    if (profile.userId !== currentUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }
    
    return this.db.update(modelProfiles)
      .set(updates)
      .where(eq(modelProfiles.id, id));
  }
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Authentication token missing"
}
```

```json
{
  "statusCode": 401,
  "message": "Token expired. Please refresh."
}
```

```json
{
  "statusCode": 401,
  "message": "Invalid token format"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required: manager or admin, Current: client"
}
```

---

## Testing with Swagger

### 1. Get JWT Token
```
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@lovnge.ru",
  "password": "admin123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@lovnge.ru",
    "role": "admin"
  }
}
```

### 2. Use Token in Swagger
1. Open http://localhost:3000/api/docs
2. Click "Authorize" button
3. Enter: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. Click "Authorize"
5. Now all protected endpoints will use your token

---

## Helper Functions

### Check Role in Service
```typescript
import { hasRole, Role } from './auth/guards/roles.guard';

// Check if user has required role
if (!hasRole(userRole, [Role.ADMIN, Role.MANAGER])) {
  throw new ForbiddenException('Insufficient permissions');
}
```

### Check Resource Ownership
```typescript
import { canAccessResource, Role } from './auth/guards/roles.guard';

// Check if user can access resource
if (!canAccessResource(userRole, resourceOwnerUserId, currentUserId)) {
  throw new ForbiddenException('You can only access your own resources');
}
```

---

## Best Practices

1. **Always use @UseGuards at controller level**
   ```typescript
   @Controller('profiles')
   @UseGuards(JwtAuthGuard, RolesGuard)
   export class ProfilesController { }
   ```

2. **Use @Public() for public routes**
   ```typescript
   @Get('catalog')
   @Public()
   async getCatalog() { }
   ```

3. **Check ownership in service layer**
   ```typescript
   // Guard checks role, service checks ownership
   async updateProfile(id: string, updates: any, userId: string) {
     const resource = await this.findById(id);
     if (resource.userId !== userId) {
       throw new ForbiddenException();
     }
   }
   ```

4. **Use most specific role possible**
   ```typescript
   // Good: Only models can access
   @Roles(Role.MODEL)
   
   // Bad: Too permissive
   @Roles(Role.CLIENT, Role.MODEL, Role.MANAGER, Role.ADMIN)
   ```

5. **Log permission denied events**
   ```typescript
   catch (error) {
     if (error instanceof ForbiddenException) {
       await this.auditLogger.log(AuditEventType.PERMISSION_DENIED, {
         userId: req.user.userId,
         resource: req.path,
       });
     }
   }
   ```

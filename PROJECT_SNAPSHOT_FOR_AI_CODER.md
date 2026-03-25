# Lovnge Platform - Complete Project Snapshot

**Generated:** 2026-03-23  
**Project Type:** Premium Escort Platform  
**Stack:** Next.js 15, NestJS 11, Drizzle ORM, PostgreSQL 16, Three.js

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Structure](#architecture--structure)
3. [Configuration Files](#configuration-files)
4. [Frontend (Next.js Web App)](#frontend-nextjs-web-app)
5. [Backend (NestJS API)](#backend-nestjs-api)
6. [Database Schema](#database-schema)
7. [Authentication System](#authentication-system)
8. [API Integration](#api-integration)
9. [Components Library](#components-library)
10. [Environment Variables](#environment-variables)

---

## Project Overview

**Lovnge** is a premium escort platform with the following features:
- Model profile management with verification system
- Client booking system with escrow payments
- Real-time availability status
- Photo/video upload with MinIO/S3 storage
- Review and rating system
- Admin dashboard for moderation

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL 16, Drizzle ORM |
| Storage | MinIO (S3-compatible) |
| Auth | JWT (15m access, 7d refresh) |
| Effects | Three.js (WebGL water ripple effects) |

---

## Architecture & Structure

```
ES/
├── apps/
│   ├── api/                    # NestJS Backend (Port 3000)
│   │   ├── src/
│   │   │   ├── auth/           # JWT authentication
│   │   │   ├── users/          # User management
│   │   │   ├── models/         # Model catalog
│   │   │   ├── profiles/       # Profile CRUD + Media
│   │   │   ├── clients/        # Client profiles
│   │   │   ├── bookings/       # Booking state machine
│   │   │   ├── escrow/         # Payment escrow
│   │   │   ├── reviews/        # Reviews/ratings
│   │   │   ├── blacklist/      # Blacklist system
│   │   │   ├── media/          # Media management
│   │   │   ├── database/       # Drizzle connection
│   │   │   ├── health/         # Health checks
│   │   │   ├── security/       # Helmet, rate limiting
│   │   │   ├── config/         # Config validation
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                    # Next.js Frontend (Port 3001)
│       ├── app/
│       │   ├── login/          # Login/Register page
│       │   ├── admin-login/    # Admin login
│       │   ├── dashboard/      # Admin dashboard
│       │   │   ├── models/     # Model management
│       │   │   ├── bookings/   # Booking management
│       │   │   ├── moderation/ # Moderation panel
│       │   │   └── settings/   # Settings
│       │   ├── models/         # Public model catalog
│       │   │   └── [slug]/     # Model detail page
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── AuthProvider.tsx
│       │   ├── ProtectedRoute.tsx
│       │   ├── SimpleSlider.tsx
│       │   ├── LiquidRippleSlider.tsx
│       │   ├── ImageUpload.tsx
│       │   └── DebugPanel.tsx
│       ├── lib/
│       │   ├── api-client.ts
│       │   ├── auth.ts
│       │   └── validations.ts
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── db/                     # Shared database package
│       ├── src/
│       │   ├── schema/
│       │   │   ├── users.ts
│       │   │   ├── model-profiles.ts
│       │   │   ├── client-profiles.ts
│       │   │   ├── bookings.ts
│       │   │   ├── escrow.ts
│       │   │   ├── reviews.ts
│       │   │   ├── blacklists.ts
│       │   │   ├── media.ts
│       │   │   ├── audit.ts
│       │   │   ├── sessions.ts
│       │   │   └── relations.ts
│       │   └── index.ts
│       ├── drizzle.config.ts
│       └── package.json
│
├── docker-compose.dev.yml
├── .env
├── .env.example
├── package.json (monorepo root)
└── README.md
```

---

## Configuration Files

### Root package.json
```json
{
  "name": "escort-platform",
  "version": "1.0.0",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:push": "turbo run db:push",
    "db:studio": "turbo run db:studio"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "typescript": "^5.7.2"
  },
  "packageManager": "npm@10.9.0",
  "engines": { "node": ">=22" }
}
```

### apps/web/package.json
```json
{
  "name": "@escort/web",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@types/three": "^0.183.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.577.0",
    "next": "^15.1.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.71.2",
    "three": "^0.183.2",
    "zod": "^4.3.6",
    "zod-validation-error": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "autoprefixer": "^10.4.27",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.4.19",
    "typescript": "^5.7.2"
  }
}
```

### apps/api/package.json
```json
{
  "name": "@escort/api",
  "version": "0.0.1",
  "scripts": {
    "dev": "ts-node -r tsconfig-paths/register src/main.ts",
    "build": "nest build",
    "start": "ts-node -r tsconfig-paths/register src/main.ts",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1013.0",
    "@aws-sdk/s3-request-presigner": "^3.1013.0",
    "@nestjs/common": "^10.4.15",
    "@nestjs/config": "^3.3.0",
    "@nestjs/core": "^10.4.15",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/swagger": "^8.1.0",
    "@nestjs/throttler": "^6.5.0",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.4",
    "drizzle-orm": "^0.36.0",
    "helmet": "^8.1.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "postgres": "^3.4.5",
    "zod": "^4.3.6"
  }
}
```

### apps/web/next.config.js
```javascript
const nextConfig = {
  reactStrictMode: true,
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '9000', pathname: '/**' },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
}
module.exports = nextConfig
```

### apps/web/tailwind.config.js
```javascript
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [],
}
```

### apps/web/tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### apps/api/tsconfig.json
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "paths": {
      "@escort/db": ["../../packages/db/src/index.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### packages/db/drizzle.config.ts
```typescript
import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
```

---

## Frontend (Next.js Web App)

### app/layout.tsx
```tsx
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Lovnge - Premium Platform',
  description: 'Премиальная платформа сопровождения',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = { themeColor: '#d4af37' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Unbounded:wght@700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          :root {
            --font-inter: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --font-unbounded: 'Unbounded', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          body { font-family: var(--font-inter); }
          h1, h2, h3, h4, h5, h6 { font-family: var(--font-unbounded); }
        `}</style>
      </head>
      <body style={{
        margin: 0, padding: 0,
        background: '#0a0a0a', color: '#e0e0e0',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### app/page.tsx
```tsx
'use client';
import SimpleSlider from '@/components/SimpleSlider';

export default function HomePage() {
  return <SimpleSlider />;
}
```

### app/login/page.tsx
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'client' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.accessToken && data.user) {
        saveAuth({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  // ... UI rendering with demo credentials display
}
```

### app/admin-login/page.tsx
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.user.role !== 'admin') {
        throw new Error('Access denied. Admin role required.');
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  // ... UI rendering
}
```

### app/dashboard/layout.tsx
```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCheck, Calendar, DollarSign,
  Shield, Settings, LogOut, Menu, X, Home, Bug, Trash2, RefreshCw,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [profileCount, setProfileCount] = useState(0);

  const navigation = [
    { name: 'Дэшборд', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Модели', href: '/dashboard/models', icon: Users },
    { name: 'Бронирования', href: '/dashboard/bookings', icon: Calendar },
    { name: 'Модерация', href: '/dashboard/moderation', icon: Shield },
    { name: 'Клиенты', href: '#', icon: UserCheck },
    { name: 'Финансы', href: '#', icon: DollarSign },
    { name: 'Настройки', href: '/dashboard/settings', icon: Settings },
  ];

  // ... sidebar rendering with debugger panel
}
```

### app/dashboard/page.tsx
```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DebugPanel } from '@/components/DebugPanel';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import {
  Users, UserCheck, Calendar, DollarSign, TrendingUp,
  Plus, ArrowRight, Settings, LogOut,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats>({
    models: 13, clients: 248, bookings: 42, revenue: '₽890K',
  });

  // ... stats grid and quick actions rendering
}
```

### app/models/page.tsx
```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ModelProfile {
  id: string;
  displayName: string;
  slug: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  eliteStatus: boolean;
  availabilityStatus: 'offline' | 'online' | 'in_shift' | 'busy';
  rateHourly: string | null;
  rateOvernight: string | null;
  psychotypeTags: string[] | null;
  languages: string[] | null;
  physicalAttributes: {
    age?: number; height?: number; weight?: number;
    bustSize?: number; bustType?: 'natural' | 'silicone';
    bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
    temperament?: 'gentle' | 'active' | 'adaptable';
    sexuality?: 'active' | 'passive' | 'universal';
  } | null;
  ratingReliability: string;
  totalMeetings: number;
  photoCount: number;
  createdAt: string;
}

export default function ModelsPage() {
  const router = useRouter();
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, online: 0, verified: 0, elite: 0 });

  const [filters, setFilters] = useState<Filters>({
    availabilityStatus: '', verificationStatus: '', eliteStatus: false,
    orderBy: 'rating', order: 'desc', limit: 20, offset: 0,
  });

  const loadModels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // ... build query params from filters
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      }
      // Load stats
      const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/models/stats`);
      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadModels(); }, [filters]);

  // ... filter sidebar and model cards grid rendering
}
```

### app/models/[slug]/page.tsx
```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LiquidRippleBackground from './LiquidRippleBackground';

interface ModelProfile { /* same as above */ }

export default function ModelProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [model, setModel] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'photos' | 'about' | 'reviews'>('photos');

  useEffect(() => {
    const loadModel = async () => {
      try {
        const slug = params?.slug as string;
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/v1/models/${slug}`);
        if (response.ok) {
          setModel(await response.json());
        } else {
          router.push('/models');
        }
      } catch (error) {
        router.push('/models');
      } finally {
        setLoading(false);
      }
    };
    if (params?.slug) loadModel();
  }, [params?.slug, router]);

  // ... model profile rendering with photo, stats, parameters, rates
}
```

---

## Backend (NestJS API)

### apps/api/src/app.module.ts
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ModelsModule } from './models/models.module';
import { ClientsModule } from './clients/clients.module';
import { BookingsModule } from './bookings/bookings.module';
import { EscrowModule } from './escrow/escrow.module';
import { ReviewsModule } from './reviews/reviews.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { MediaModule } from './media/media.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AuthGuardsModule } from './auth/guards/auth-guards.module';
import { RateLimitModule } from './security/rate-limit.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    DatabaseModule, HealthModule, UsersModule, AuthModule,
    AuthGuardsModule, RateLimitModule, ModelsModule, ClientsModule,
    BookingsModule, EscrowModule, ReviewsModule, BlacklistModule,
    MediaModule, ProfilesModule,
  ],
})
export class AppModule {}
```

### apps/api/src/main.ts
```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Catch, ExceptionFilter, ArgumentsHost, Logger, VersioningType, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Response, Request } from 'express';
import { validateEnv } from './config/validation.schema';
import { getHelmetConfig } from './security/helmet.config';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isDev = process.env.NODE_ENV === 'development';

    this.logger.error({
      message: exception?.message, stack: exception?.stack,
      url: request?.url, method: request?.method,
      ip: request?.ip, userAgent: request?.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    response.status(exception?.status || 500).json({
      statusCode: exception?.status || 500,
      message: exception?.message || 'Internal server error',
      ...(isDev && { stack: exception?.stack }),
      ...(isDev && { error: exception?.name }),
    });
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Validating environment variables...');
  const envConfig = validateEnv(process.env);
  logger.log(`✓ Environment validated (NODE_ENV: ${envConfig.NODE_ENV})`);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    snapshot: process.env.NODE_ENV === 'development',
  });

  const configService = app.get(ConfigService);

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.use(getHelmetConfig(configService));
  logger.log('✓ Helmet security headers enabled');

  // CORS configuration
  const allowedOrigins = [envConfig.FRONTEND_URL, ...(envConfig.ALLOWED_ORIGINS || '').split(',')];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: false, transform: true,
    transformOptions: { enableImplicitConversion: true },
    disableErrorMessages: envConfig.NODE_ENV === 'production',
  }));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Lovnge Platform API')
    .setDescription('Premium escort platform API documentation')
    .setVersion('1.0')
    .addBearerAuth({ description: 'JWT token obtained from /auth/login', bearerFormat: 'Bearer', scheme: 'Bearer', type: 'http' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT', '3000');
  const host = configService.get('HOST', '0.0.0.0');
  await app.listen(port, host);

  logger.log(`🚀 API running on: http://${host}:${port}`);
  logger.log(`📚 Swagger docs: http://${host}:${port}/api/docs`);
}

bootstrap().catch((err) => {
  Logger.error('Failed to start application', err);
  process.exit(1);
});
```

### apps/api/src/auth/auth.controller.ts
```typescript
import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail() email: string;
  @ApiProperty({ example: 'password123' })
  @IsString() @MinLength(8) password: string;
  @ApiProperty({ required: false, enum: ['client', 'model', 'admin'] })
  role?: 'client' | 'model' | 'admin';
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail() email: string;
  @ApiProperty({ example: 'password123' })
  @IsString() password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  async register(@Body() body: RegisterDto) {
    if (!body.email || !body.password) {
      throw new UnauthorizedException('Email and password are required');
    }
    if (body.password.length < 8) {
      throw new UnauthorizedException('Password must be at least 8 characters');
    }
    return await this.authService.register(body.email, body.password, body.role);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  async login(@Body() body: any) {
    if (!body.email) throw new UnauthorizedException('Email is required');
    if (!body.password) throw new UnauthorizedException('Password is required');
    return await this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить токены' })
  async refresh(@Body() body: { refreshToken: string }) {
    return await this.authService.refreshTokens('', body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(@Request() req) {
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getProfile(@Request() req) {
    return req.user;
  }
}
```

### apps/api/src/auth/auth.service.ts
```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import type { User } from '@escort/db';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(email: string, password: string, role: 'client' | 'model' | 'admin' = 'client') {
    const user = await this.usersService.createUser(email, password, role);
    const tokens = await this.generateTokens(user);
    return {
      user: { id: user.id, email, role: user.role, status: user.status },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'suspended' || user.status === 'blacklisted') {
      throw new UnauthorizedException('Account is blocked');
    }
    const isValid = await this.usersService.validatePassword(user, password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    await this.usersService.updateLastLogin(user.id);
    const tokens = await this.generateTokens(user);
    return {
      user: { id: user.id, email, role: user.role, status: user.status },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const refreshTokenPayload = await this.verifyToken(refreshToken, 'refresh');
    if (refreshTokenPayload.sub !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return await this.generateTokens(user);
  }

  async validateToken(token: string): Promise<{ userId: string; role: string } | null> {
    try {
      const payload = await this.verifyToken(token, 'access');
      return { userId: payload.sub, role: payload.role };
    } catch { return null; }
  }

  private async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(user.id, user.role, 'access'),
      this.signToken(user.id, user.role, 'refresh'),
    ]);
    return { accessToken, refreshToken };
  }

  private async signToken(userId: string, role: string, type: 'access' | 'refresh') {
    const payload = { sub: userId, role, type };
    const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
    const expiresIn = type === 'access' ? '15m' : '7d';
    return this.jwtService.sign(payload, {
      secret, expiresIn, issuer: 'lovnge-api', audience: 'lovnge-client',
    });
  }

  private async verifyToken(token: string, type: 'access' | 'refresh') {
    const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
    const payload = await this.jwtService.verifyAsync(token, { secret });
    if (payload.type !== type) throw new UnauthorizedException('Invalid token type');
    return payload;
  }
}
```

### apps/api/src/models/models.controller.ts
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import type { ModelProfile } from '@escort/db';

@ApiTags('Models')
@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get()
  @ApiOperation({ summary: 'Каталог моделей с фильтрами' })
  @ApiQuery({ name: 'availabilityStatus', required: false, enum: ['offline', 'online', 'in_shift', 'busy'] })
  @ApiQuery({ name: 'verificationStatus', required: false, enum: ['pending', 'verified', 'rejected'] })
  @ApiQuery({ name: 'eliteStatus', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'orderBy', required: false, enum: ['rating', 'createdAt', 'displayName'] })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  async getCatalog(@Query() query: any): Promise<ModelProfile[]> {
    const filters = {
      availabilityStatus: query.availabilityStatus,
      verificationStatus: query.verificationStatus,
      eliteStatus: query.eliteStatus === 'true',
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
      orderBy: query.orderBy as 'rating' | 'createdAt' | 'displayName',
      order: query.order as 'asc' | 'desc',
    };
    return this.modelsService.getCatalog(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Статистика по моделям' })
  async getStats(): Promise<any> {
    return this.modelsService.getStats();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Профиль модели по slug' })
  async getBySlug(@Param('slug') slug: string): Promise<ModelProfile | null> {
    return this.modelsService.findBySlug(slug);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Профиль модели по ID' })
  async getById(@Param('id') id: string): Promise<ModelProfile | null> {
    return this.modelsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать профиль модели' })
  async create(@Body() body: { displayName: string; slug?: string }): Promise<ModelProfile> {
    if (!body.displayName) throw new BadRequestException('displayName is required');
    return this.modelsService.createProfile(undefined as any, body.displayName, body.slug);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить профиль модели' })
  async update(@Param('id') id: string, @Body() body: any): Promise<ModelProfile> {
    return this.modelsService.updateProfile(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить профиль модели' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.modelsService.deleteProfile(id);
  }
}
```

### apps/api/src/models/models.service.ts
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, desc, asc } from 'drizzle-orm';
import { modelProfiles, type ModelProfile, type NewModelProfile } from '@escort/db';

@Injectable()
export class ModelsService {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  async createProfile(userId: string, displayName: string, slug?: string): Promise<ModelProfile> {
    const existing = await this.findByUserId(userId);
    if (existing) throw new ConflictException('Profile already exists for this user');
    if (slug) {
      const existingSlug = await this.findBySlug(slug);
      if (existingSlug) throw new ConflictException('This slug is already taken');
    }
    const newProfiles = await this.db.insert(modelProfiles).values({ userId, displayName, slug }).returning();
    return newProfiles[0];
  }

  async findByUserId(userId: string): Promise<ModelProfile | null> {
    const found = await this.db.select().from(modelProfiles).where(eq(modelProfiles.userId, userId)).limit(1);
    return found[0] || null;
  }

  async findBySlug(slug: string): Promise<ModelProfile | null> {
    const found = await this.db.select().from(modelProfiles).where(eq(modelProfiles.slug, slug)).limit(1);
    return found[0] || null;
  }

  async findById(id: string): Promise<ModelProfile | null> {
    const found = await this.db.select().from(modelProfiles).where(eq(modelProfiles.id, id)).limit(1);
    return found[0] || null;
  }

  async getCatalog(filters?: {
    availabilityStatus?: 'offline' | 'online' | 'in_shift' | 'busy';
    verificationStatus?: 'pending' | 'video_required' | 'document_required' | 'verified' | 'rejected';
    eliteStatus?: boolean;
    limit?: number; offset?: number;
    orderBy?: 'rating' | 'createdAt' | 'displayName';
    order?: 'asc' | 'desc';
  }): Promise<ModelProfile[]> {
    const conditions: any[] = [];
    if (filters?.availabilityStatus) conditions.push(eq(modelProfiles.availabilityStatus, filters.availabilityStatus));
    if (filters?.verificationStatus) conditions.push(eq(modelProfiles.verificationStatus, filters.verificationStatus));
    if (filters?.eliteStatus === true) conditions.push(eq(modelProfiles.eliteStatus, true));

    const orderFunc = filters?.order === 'asc' ? asc : desc;
    let orderByColumn;
    switch (filters?.orderBy) {
      case 'rating': orderByColumn = modelProfiles.ratingReliability; break;
      case 'createdAt': orderByColumn = modelProfiles.createdAt; break;
      case 'displayName': default: orderByColumn = modelProfiles.displayName;
    }

    const query = this.db.select().from(modelProfiles);
    if (conditions.length > 0) query.where(and(...conditions));
    query.orderBy(orderFunc(orderByColumn));
    query.limit(filters?.limit || 50);
    query.offset(filters?.offset || 0);
    return await query;
  }

  async updateProfile(id: string, updates: Partial<NewModelProfile>): Promise<ModelProfile> {
    const updated = await this.db.update(modelProfiles).set(updates).where(eq(modelProfiles.id, id)).returning();
    if (!updated || updated.length === 0) throw new NotFoundException('Profile not found');
    return updated[0];
  }

  async updateAvailability(userId: string, status: 'offline' | 'online' | 'in_shift' | 'busy'): Promise<ModelProfile> {
    const profile = await this.findByUserId(userId);
    if (!profile) throw new NotFoundException('Profile not found');
    const updated = await this.db.update(modelProfiles)
      .set({ availabilityStatus: status, nextAvailableAt: status === 'offline' ? new Date(Date.now() + 3600000) : null })
      .where(eq(modelProfiles.userId, userId)).returning();
    return updated[0];
  }

  async deleteProfile(id: string): Promise<void> {
    await this.db.delete(modelProfiles).where(eq(modelProfiles.id, id));
  }

  async getStats(): Promise<{ total: number; online: number; verified: number; elite: number }> {
    const all = await this.db.select().from(modelProfiles);
    return {
      total: all.length,
      online: all.filter((m: ModelProfile) => m.availabilityStatus === 'online').length,
      verified: all.filter((m: ModelProfile) => m.verificationStatus === 'verified').length,
      elite: all.filter((m: ModelProfile) => m.eliteStatus === true).length,
    };
  }
}
```

### apps/api/src/users/users.service.ts
```typescript
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users, type User, type NewUser } from '@escort/db';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  async createUser(email: string, password: string, role: 'client' | 'model' | 'admin' | 'manager' = 'client'): Promise<User> {
    this.logger.log(`Creating user: ${email}, role: ${role}`);
    try {
      const existing = await this.findByEmail(email);
      if (existing) throw new ConflictException('User with this email already exists');

      const passwordHash = await bcrypt.hash(password, 10);
      const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

      const newUsers = await this.db.insert(users).values({
        emailHash, passwordHash, role, status: 'pending_verification',
      }).returning();

      this.logger.log(`User created: ${newUsers[0]?.id}`);
      return newUsers[0];
    } catch (error: any) {
      this.logger.error(`Create user error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
    const foundUsers = await this.db.select().from(users).where(eq(users.emailHash, emailHash)).limit(1);
    return foundUsers[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const foundUsers = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return foundUsers[0] || null;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id));
  }

  async findAll(limit = 50, offset = 0): Promise<User[]> {
    return this.db.select().from(users).limit(limit).offset(offset);
  }

  async updateStatus(id: string, status: User['status']): Promise<User> {
    const updated = await this.db.update(users).set({ status }).where(eq(users.id, id)).returning();
    if (!updated || updated.length === 0) throw new NotFoundException('User not found');
    return updated[0];
  }

  async linkClerkId(id: string, clerkId: string): Promise<User> {
    const updated = await this.db.update(users).set({ clerkId }).where(eq(users.id, id)).returning();
    if (!updated || updated.length === 0) throw new NotFoundException('User not found');
    return updated[0];
  }
}
```

### apps/api/src/database/database.module.ts
```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@escort/db';
const postgres = require('postgres');

@Global()
@Module({
  providers: [{
    provide: 'DRIZZLE',
    useFactory: (configService: ConfigService) => {
      const databaseUrl = configService.get<string>('DATABASE_URL');
      if (!databaseUrl) throw new Error('DATABASE_URL is not defined');
      const client = postgres(databaseUrl);
      return drizzle(client, { schema });
    },
    inject: [ConfigService],
  }],
  exports: ['DRIZZLE'],
})
export class DatabaseModule {}
```

### apps/api/src/profiles/minio.service.ts
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MinioService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private configService: ConfigService) {
    const endpoint = configService?.get?.<string>('MINIO_ENDPOINT') || 'localhost:9000';
    const accessKey = configService?.get?.<string>('MINIO_ACCESS_KEY') || 'minioadmin';
    const secretKey = configService?.get?.<string>('MINIO_SECRET_KEY') || 'minioadmin';
    this.bucket = configService?.get?.<string>('MINIO_BUCKET') || 'escort-media';
    this.publicUrl = configService?.get?.<string>('MINIO_PUBLIC_URL') || `http://${endpoint}`;

    this.s3Client = new S3Client({
      endpoint: `http://${endpoint}`, region: 'us-east-1',
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
    });

    this.logger.log(`MinIO initialized: ${endpoint}/${this.bucket}`);
  }

  async generateUploadUrl(fileName: string, mimeType: string, fileSize: number): Promise<{
    uploadUrl: string; storageKey: string; cdnUrl: string; expiresAt: Date;
  }> {
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storageKey = `uploads/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket, Key: storageKey, ContentType: mimeType, ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    const cdnUrl = `${this.publicUrl}/${this.bucket}/${storageKey}`;
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    return { uploadUrl, storageKey, cdnUrl, expiresAt };
  }

  async getViewUrl(storageKey: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  getPublicUrl(storageKey: string): string {
    return `${this.publicUrl}/${this.bucket}/${storageKey}`;
  }

  async deleteFile(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey });
    await this.s3Client.send(command);
    this.logger.log(`Deleted file: ${storageKey}`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket, Key: '.healthcheck', Body: Buffer.from('ok'),
      }));
      return true;
    } catch (error) {
      this.logger.error('MinIO health check failed', error);
      return false;
    }
  }
}
```

---

## Database Schema

### packages/db/src/schema/users.ts
```typescript
import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  emailHash: varchar('email_hash', { length: 64 }).notNull().unique(),
  phoneToken: varchar('phone_token', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).$type<'admin' | 'manager' | 'model' | 'client'>().notNull().default('client'),
  status: varchar('status', { length: 30 }).$type<'active' | 'suspended' | 'pending_verification' | 'blacklisted'>().notNull().default('pending_verification'),
  clerkId: varchar('clerk_id', { length: 255 }).unique(),
  lastLogin: timestamp('last_login'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('email_hash_idx').on(table.emailHash),
  roleIdx: index('role_idx').on(table.role),
  statusIdx: index('status_idx').on(table.status),
  clerkIdx: index('clerk_id_idx').on(table.clerkId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### packages/db/src/schema/model-profiles.ts
```typescript
import { pgTable, uuid, varchar, decimal, integer, jsonb, boolean, timestamp, index, uniqueIndex, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const modelProfiles = pgTable('model_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  managerId: uuid('manager_id').references(() => users.id),

  // Basic info
  displayName: varchar('display_name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique(),
  biography: text('biography'),

  // Verification
  verificationStatus: varchar('verification_status', { length: 30 })
    .$type<'pending' | 'video_required' | 'document_required' | 'verified' | 'rejected'>()
    .default('pending'),
  verificationCompletedAt: timestamp('verification_completed_at'),
  lastVideoVerification: timestamp('last_video_verification'),
  eliteStatus: boolean('elite_status').default(false),

  // Pricing
  rateHourly: decimal('rate_hourly', { precision: 10, scale: 2 }),
  rateOvernight: decimal('rate_overnight', { precision: 10, scale: 2 }),

  // Availability
  availabilityStatus: varchar('availability_status', { length: 30 })
    .$type<'offline' | 'online' | 'in_shift' | 'busy'>()
    .default('offline'),
  nextAvailableAt: timestamp('next_available_at'),

  // Attributes (JSONB)
  psychotypeTags: jsonb('psychotype_tags').$type<string[]>(),
  languages: jsonb('languages').$type<string[]>(),
  physicalAttributes: jsonb('physical_attributes').$type<{
    age?: number; height?: number; weight?: number; bustSize?: number;
    bustType?: 'natural' | 'silicone'; bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
    temperament?: 'gentle' | 'active' | 'adaptable'; sexuality?: 'active' | 'passive' | 'universal';
    hairColor?: string; eyeColor?: string;
  }>(),

  // Stats
  ratingReliability: decimal('rating_reliability', { precision: 3, scale: 2 }).default('0.00'),
  totalMeetings: integer('total_meetings').default(0),
  totalCancellations: integer('total_cancellations').default(0),
  cancellationsLast3Months: integer('cancellations_last_3_months').default(0),

  // Media
  photoCount: integer('photo_count').default(0),
  videoWalkthroughUrl: varchar('video_walkthrough_url', { length: 500 }),
  videoVerificationUrl: varchar('video_verification_url', { length: 500 }),
  mainPhotoUrl: varchar('main_photo_url', { length: 500 }),

  // Publication
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('model_user_unique').on(table.userId),
  managerIdx: index('model_manager_idx').on(table.managerId),
  slugIdx: uniqueIndex('model_slug_unique').on(table.slug),
  statusIdx: index('model_status_idx').on(table.availabilityStatus),
  eliteIdx: index('model_elite_idx').on(table.eliteStatus),
  verificationIdx: index('model_verification_idx').on(table.verificationStatus),
  publishedIdx: index('model_published_idx').on(table.isPublished),
}));

export type ModelProfile = typeof modelProfiles.$inferSelect;
export type NewModelProfile = typeof modelProfiles.$inferInsert;
```

### packages/db/src/schema/media.ts
```typescript
import { pgTable, uuid, varchar, integer, timestamp, jsonb, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { modelProfiles } from './model-profiles';

export const mediaFiles = pgTable('media_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'cascade' }),
  fileType: varchar('file_type', { length: 20 }).$type<'photo' | 'video' | 'document'>().notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size'),
  storageKey: varchar('storage_key', { length: 500 }).notNull().unique(),
  bucket: varchar('bucket', { length: 100 }).default('escort-media'),
  cdnUrl: varchar('cdn_url', { length: 500 }),
  presignedUrl: varchar('presigned_url', { length: 1000 }),
  presignedExpiresAt: timestamp('presigned_expires_at'),
  sortOrder: integer('sort_order').default(0),
  isVerified: boolean('is_verified').default(false),
  verificationDate: timestamp('verification_date'),
  metadata: jsonb('metadata').$type<{
    width?: number; height?: number; duration?: number;
    uploadedFrom?: string; originalName?: string;
  }>(),
  moderationStatus: varchar('moderation_status', { length: 20 })
    .$type<'pending' | 'approved' | 'rejected'>().default('pending'),
  moderationReason: varchar('moderation_reason', { length: 500 }),
  moderatedBy: uuid('moderated_by').references(() => users.id),
  moderatedAt: timestamp('moderated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  ownerIdx: index('media_owner_idx').on(table.ownerId),
  modelIdx: index('media_model_idx').on(table.modelId),
  typeIdx: index('media_type_idx').on(table.fileType),
  verifiedIdx: index('media_verified_idx').on(table.isVerified),
  moderationIdx: index('media_moderation_idx').on(table.moderationStatus),
  storageKeyIdx: uniqueIndex('media_storage_key_unique').on(table.storageKey),
}));

export type MediaFile = typeof mediaFiles.$inferSelect;
export type NewMediaFile = typeof mediaFiles.$inferInsert;
```

### Database Tables Summary

| Table | Description |
|-------|-------------|
| `users` | Base user table (auth, roles) |
| `client_profiles` | Client user profiles |
| `model_profiles` | Model profiles with verification, rates, availability |
| `bookings` | Booking state machine |
| `escrow_transactions` | Payment escrow |
| `reviews` | Reviews and ratings |
| `blacklists` | Blacklisted users |
| `media_files` | Photo/video files (MinIO references) |
| `booking_audit_logs` | Audit trail for bookings |
| `sessions` | User sessions |

---

## Authentication System

### Flow Overview

1. **Registration**: POST `/auth/register` → creates user with hashed password/email
2. **Login**: POST `/auth/login` → returns JWT access + refresh tokens
3. **Token Refresh**: POST `/auth/refresh` → get new tokens
4. **Protected Routes**: `Authorization: Bearer <token>` header

### Token Structure

```typescript
// Access Token (15 minutes)
{
  sub: userId,
  role: 'admin' | 'manager' | 'model' | 'client',
  type: 'access',
  iat: timestamp,
  exp: timestamp,
  iss: 'lovnge-api',
  aud: 'lovnge-client'
}

// Refresh Token (7 days)
{
  sub: userId,
  role: '...',
  type: 'refresh',
  iat: timestamp,
  exp: timestamp,
  iss: 'lovnge-api',
  aud: 'lovnge-client'
}
```

### Frontend Auth Utilities (apps/web/lib/auth.ts)

```typescript
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'model' | 'client';
  status: 'active' | 'suspended' | 'blacklisted';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthData extends AuthTokens {
  user: User;
}

export function saveAuth(data: AuthData): void {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('authTimestamp', Date.now().toString());
}

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try { return JSON.parse(userStr); } catch { return null; }
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch { return false; }
}

export function clearAuth(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('authTimestamp');
}
```

### AuthProvider Component (apps/web/components/AuthProvider.tsx)

```tsx
'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User { id: string; email: string; role: string; status: string; }

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, refreshToken: string, userData: User) => void;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (initialized) return;
    const initAuth = () => {
      try {
        const token = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Auth init error:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    initAuth();
  }, []);

  const login = useCallback((token: string, refreshToken: string, userData: User) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  }, [router]);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

## API Integration

### API Client (apps/web/lib/api-client.ts)

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const BASE_PATH = API_URL; // No versioning prefix

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface PhysicalAttributes {
  age?: number; height?: number; weight?: number;
  bustSize?: number; bustType?: 'natural' | 'silicone';
  bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
  temperament?: 'gentle' | 'active' | 'adaptable';
  sexuality?: 'active' | 'passive' | 'universal';
  hairColor?: string; eyeColor?: string;
}

export interface CreateProfileData {
  displayName: string;
  slug?: string;
  biography?: string;
  physicalAttributes?: PhysicalAttributes;
  languages?: string[];
  psychotypeTags?: string[];
  rateHourly?: number;
  rateOvernight?: number;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  biography?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  eliteStatus: boolean;
  isPublished: boolean;
  mainPhotoUrl?: string;
  physicalAttributes?: PhysicalAttributes;
  createdAt: string;
  updatedAt: string;
}

export interface PresignedUrlData {
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4';
  fileSize: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  storageKey: string;
  cdnUrl: string;
  mediaId: string;
}

// Helper functions
async function handleResponse<T>(response: Response): Promise<T> {
  const responseClone = response.clone();

  if (!response.ok) {
    let errorData: any = {};
    let errorText = '';

    try {
      errorText = await responseClone.text();
      console.error('❌ API Error Response Body:', errorText);

      if (errorText.trim().startsWith('{')) {
        errorData = JSON.parse(errorText);
      }
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }

    const message = Array.isArray(errorData?.message)
      ? errorData.message[0]
      : errorData?.message || `HTTP ${response.status}: ${response.statusText}`;

    throw new Error(message);
  }

  return response.json();
}

function getAuthHeader(): HeadersInit {
  let token = localStorage.getItem('accessToken');

  if (token) {
    token = token.replace(/^"|"$/g, '');
    token = token.replace(/^Bearer\s+/i, '');
  }

  return token && token.length > 0 ? { Authorization: `Bearer ${token}` } : {};
}

// API Client
export const api = {
  async createProfile(data: CreateProfileData): Promise<Profile> {
    const response = await fetch(`${BASE_PATH}/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Profile>(response);
  },

  async getMyProfile(): Promise<Profile | null> {
    const response = await fetch(`${BASE_PATH}/profiles/me`, {
      headers: getAuthHeader(),
    });
    const data = await handleResponse<{ profile: Profile | null }>(response);
    return data.profile;
  },

  async getProfile(id: string): Promise<Profile> {
    const response = await fetch(`${BASE_PATH}/profiles/${id}`);
    return handleResponse<Profile>(response);
  },

  async getCatalog(params?: { limit?: number; offset?: number; includeUnpublished?: boolean }): Promise<Profile[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.includeUnpublished) searchParams.set('includeUnpublished', 'true');
    const response = await fetch(`${BASE_PATH}/profiles?${searchParams.toString()}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<Profile[]>(response);
  },

  async updateProfile(id: string, data: Partial<CreateProfileData>): Promise<Profile> {
    const response = await fetch(`${BASE_PATH}/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<Profile>(response);
  },

  async publishProfile(id: string, isPublished: boolean): Promise<Profile> {
    const response = await fetch(`${BASE_PATH}/profiles/${id}/publish`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ isPublished }),
    });
    return handleResponse<Profile>(response);
  },

  async generatePresignedUrl(data: PresignedUrlData): Promise<PresignedUrlResponse> {
    const response = await fetch(`${BASE_PATH}/profiles/media/presigned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<PresignedUrlResponse>(response);
  },

  async confirmUpload(mediaId: string, data: { cdnUrl?: string; metadata?: any }): Promise<any> {
    const response = await fetch(`${BASE_PATH}/profiles/media/${mediaId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async uploadToMinIO(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!response.ok) throw new Error('Upload failed');
  },

  async setMainPhoto(mediaId: string, modelId: string): Promise<Profile> {
    const response = await fetch(`${BASE_PATH}/profiles/media/${mediaId}/set-main?modelId=${modelId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
    });
    return handleResponse<Profile>(response);
  },

  async getProfileMedia(modelId: string): Promise<any[]> {
    const response = await fetch(`${BASE_PATH}/profiles/models/${modelId}/media`);
    return handleResponse(response);
  },

  async deleteMedia(mediaId: string): Promise<void> {
    const response = await fetch(`${BASE_PATH}/profiles/media/${mediaId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Delete failed');
    }
  },
};

export default api;
```

### Validation Schemas (apps/web/lib/validations.ts)

```typescript
import { z } from 'zod';

export const physicalAttributesSchema = z.object({
  age: z.coerce.number().optional().nullable(),
  height: z.coerce.number().optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  bustSize: z.coerce.number().optional().nullable(),
  bustType: z.enum(['natural', 'silicone']).optional().nullable(),
  bodyType: z.enum(['slim', 'curvy', 'bbw', 'pear', 'fit']).optional().nullable(),
  temperament: z.enum(['gentle', 'active', 'adaptable']).optional().nullable(),
  sexuality: z.enum(['active', 'passive', 'universal']).optional().nullable(),
  hairColor: z.string().optional().nullable(),
  eyeColor: z.string().optional().nullable(),
});

export const createProfileSchema = z.object({
  displayName: z.string().min(1, 'Введите имя'),
  slug: z.string().optional().or(z.literal('')),
  biography: z.string().optional().or(z.literal('')),
  physicalAttributes: physicalAttributesSchema.optional().nullable(),
  languages: z.array(z.string()).optional(),
  psychotypeTags: z.array(z.string()).optional(),
  rateHourly: z.coerce.number().optional().nullable(),
  rateOvernight: z.coerce.number().optional().nullable(),
});

export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 104857600, 'File size must be less than 100MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type),
      'Only JPEG, PNG, WebP, MP4, and WebM files are allowed'
    ),
});

export type PhysicalAttributesInput = z.infer<typeof physicalAttributesSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
```

---

## Components Library

### ProtectedRoute (apps/web/components/ProtectedRoute.tsx)

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('admin' | 'manager' | 'model' | 'client')[];
}

export function ProtectedRoute({
  children,
  requiredRoles = ['admin', 'manager', 'model', 'client']
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && requiredRoles && !requiredRoles.includes(user.role)) {
      router.replace('/dashboard');
      return;
    }
  }, [user, loading, pathname, router, requiredRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto mb-4" />
          <p className="text-[#d4af37] text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user && pathname !== '/login') return null;
  if (user && requiredRoles && !requiredRoles.includes(user.role)) return null;

  return <>{children}</>;
}
```

### ImageUpload (apps/web/components/ImageUpload.tsx)

```tsx
'use client';
import { useState, useCallback, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api-client';

interface ImageUploadProps {
  onUploadComplete: (mediaId: string, cdnUrl: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  modelId?: string;
}

export default function ImageUpload({
  onUploadComplete, onError, accept = 'image/*', maxSize = 104857600, modelId,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) return `File size must be less than ${maxSize / 1048576}MB`;
    if (!accept.includes(file.type) && !accept.includes('*')) {
      return `Invalid file type. Accepted: ${accept}`;
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const { uploadUrl, storageKey, cdnUrl, mediaId } = await api.generatePresignedUrl({
        fileName: file.name, mimeType: file.type as any, fileSize: file.size,
      });

      await api.uploadToMinIO(uploadUrl, file);
      await api.confirmUpload(mediaId, { cdnUrl, modelId, metadata: { originalName: file.name } });

      onUploadComplete(mediaId, cdnUrl);
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  }, [onUploadComplete, onError, accept, maxSize]);

  // ... drag & drop handlers and UI rendering
}
```

### SimpleSlider (apps/web/components/SimpleSlider.tsx)

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const SLIDES = [
  { id: '1', name: 'Юлианна', age: 22, tier: 'VIP', location: 'Москва', image: '/images_tst/photo-1544005313-94ddf0286df2.jpg' },
  { id: '2', name: 'Виктория', age: 25, tier: 'Elite', location: 'Санкт-Петербург', image: '/images_tst/photo-1534528741775-53994a69daeb.jpg' },
  { id: '3', name: 'Алина', age: 23, tier: 'Premium', location: 'Москва', image: '/images_tst/photo-1524504388940-b1c1722653e1.jpg' },
  { id: '4', name: 'София', age: 24, tier: 'VIP', location: 'Дубай', image: '/images_tst/photo-1531746020798-e6953c6e8e04.jpg' },
  { id: '5', name: 'Наталья', age: 27, tier: 'Elite', location: 'Москва', image: '/images_tst/photo-1529626455594-4ff0802cfb7e.jpg' },
];

export default function SimpleSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Autoplay
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      setProgress(0);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Progress bar
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 100 / (4000 / 50);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ... slider UI with navigation controls, progress bar, features section
}
```

### LiquidRippleSlider (apps/web/components/LiquidRippleSlider.tsx)

Three.js-based water ripple effect slider with advanced GPU shaders. Key features:
- Custom fragment/vertex shaders for water distortion
- Ripple simulation with damping and viscosity
- Mouse/touch interaction for creating ripples
- Chromatic aberration and caustics effects
- Auto-play with progress bar

(See full implementation in component files - ~931 lines)

---

## Environment Variables

### .env.example
```bash
# ============================================
# DATABASE (PostgreSQL 16)
# ============================================
DATABASE_URL=postgresql://companion:companion_dev_password@localhost:5432/companion_db

# ============================================
# REDIS (sessions/cache)
# ============================================
REDIS_URL=redis://localhost:6379

# ============================================
# MinIO / S3 (file storage)
# ============================================
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=companion_minio_admin
MINIO_SECRET_KEY=companion_minio_password
MINIO_BUCKET=escort-media
MINIO_USE_SSL=false
MINIO_PUBLIC_URL=http://localhost:9000

# ============================================
# Auth (JWT)
# ============================================
JWT_SECRET=escort-platform-super-secret-jwt-key-change-in-production-2026
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Clerk (optional)
CLERK_SECRET_KEY=sk_test_xxx
CLERK_PUBLISHABLE_KEY=pk_test_xxx

# ============================================
# Encryption (32 bytes hex)
# ============================================
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# ============================================
# API Server (NestJS)
# ============================================
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# ============================================
# Web Server (Next.js)
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# ============================================
# Admin Dashboard
# ============================================
ADMIN_EMAIL=admin@lovnge.com
ADMIN_PASSWORD_HASH=$2b$10$YourHashedPasswordHere
```

---

## API Endpoints Summary

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login (returns JWT) |
| POST | `/auth/refresh` | Refresh tokens |
| POST | `/auth/logout` | Logout (requires auth) |
| GET | `/auth/me` | Get current user |

### Models
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/models` | Get catalog with filters |
| GET | `/models/stats` | Get statistics |
| GET | `/models/:slug` | Get by slug |
| GET | `/models/id/:id` | Get by ID |
| POST | `/models` | Create model |
| PUT | `/models/:id` | Update model |
| DELETE | `/models/:id` | Delete model |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profiles` | Create profile (auth) |
| GET | `/profiles/me` | Get my profile (auth) |
| GET | `/profiles/:id` | Get by ID |
| GET | `/profiles/slug/:slug` | Get by slug |
| PUT | `/profiles/:id` | Update profile (auth) |
| PUT | `/profiles/:id/publish` | Toggle publication (auth) |
| DELETE | `/profiles/:id` | Delete profile (auth) |

### Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profiles/media/presigned` | Get presigned URL (auth) |
| POST | `/profiles/media/:id/confirm` | Confirm upload (auth) |
| GET | `/profiles/models/:modelId/media` | Get model media |
| PUT | `/profiles/media/:id/set-main` | Set main photo (auth) |
| PUT | `/profiles/media/:id/approve` | Approve media (admin) |
| PUT | `/profiles/media/:id/reject` | Reject media (admin) |
| DELETE | `/profiles/media/:id` | Delete media (auth) |

---

## Quick Start Commands

```bash
# Start Docker services
docker-compose -f docker-compose.dev.yml up -d

# Start API (port 3000)
cd apps/api
npx ts-node -r tsconfig-paths/register src/main.ts

# Start Web (port 3001)
cd apps/web
npm run dev

# Database commands
cd packages/db
npx drizzle-kit generate
npx drizzle-kit push
npx drizzle-kit studio
```

---

## Service URLs

| Service | URL |
|---------|-----|
| Web App | http://localhost:3001 |
| API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/api/docs |
| MinIO Console | http://localhost:9001 |
| Mailhog | http://localhost:8025 |

---

## Known Issues & Fixes

### Issue: ProtectedRoute Import Error
**Error:** `Element type is invalid: expected a string... but got: undefined`

**Fix:** Change import from default to named:
```typescript
// ❌ WRONG
import ProtectedRoute from '@/components/ProtectedRoute';

// ✅ CORRECT
import { ProtectedRoute } from '@/components/ProtectedRoute';
```

**Files affected:**
- `apps/web/app/dashboard/page.tsx` (line 11)
- `apps/web/app/dashboard/models/list/page.tsx` (line 10)

---

**End of Project Snapshot**

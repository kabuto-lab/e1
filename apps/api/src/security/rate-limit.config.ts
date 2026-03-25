/**
 * Rate Limiting & DDoS Protection Configuration
 * 
 * Uses @nestjs/throttler to implement rate limiting at multiple levels:
 * - Default: 100 requests per minute (general API)
 * - Auth: 5 requests per minute (login, register — prevent brute force)
 * - Strict: 10 requests per minute (expensive operations)
 * 
 * @see https://docs.nestjs.com/techniques/security#rate-limiting
 */

import { Module, Global } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Rate limit presets for different use cases
 */
export const RateLimitPresets = {
  /**
   * Default API rate limit
   * Suitable for most endpoints
   */
  default: {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  },

  /**
   * Authentication endpoints (login, register, password reset)
   * Strict limit to prevent brute force attacks
   */
  auth: {
    ttl: 60000, // 1 minute
    limit: 5, // 5 attempts per minute
  },

  /**
   * Expensive operations (file uploads, bulk exports, reports)
   * Lower limit to protect server resources
   */
  strict: {
    ttl: 60000, // 1 minute
    limit: 10, // 10 requests per minute
  },

  /**
   * Public endpoints (catalog, health check)
   * More permissive for public access
   */
  public: {
    ttl: 60000, // 1 minute
    limit: 200, // 200 requests per minute
  },
};

/**
 * Custom throttler storage for Redis-backed rate limiting
 * (Optional — implement when Redis module is added)
 */
// import { Redis } from 'ioredis';
// export class RedisThrottlerStorage implements ThrottlerStorageOptions {
//   private redis: Redis;
//   
//   constructor(redisUrl: string) {
//     this.redis = new Redis(redisUrl);
//   }
//   
//   async increment(key: string, ttl: number): Promise<{ hits: number; ttl: number }> {
//     const hits = await this.redis.incr(key);
//     if (hits === 1) {
//       await this.redis.expire(key, Math.floor(ttl / 1000));
//     }
//     return { hits, ttl };
//   }
// }

/**
 * Rate Limiting Module
 * 
 * Configures global rate limiting with different presets for different routes.
 * Apply specific limits using @Throttle() decorator on controllers/methods.
 */
@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttl = configService.get<number>('RATE_LIMIT_TTL', 60) * 1000;
        const limit = configService.get<number>('RATE_LIMIT_MAX', 100);

        return {
          throttlers: [
            {
              name: 'default',
              ttl,
              limit,
            },
          ],
          // Storage can be upgraded to Redis for distributed rate limiting
          // storage: new RedisThrottlerStorage(configService.getOrThrow('REDIS_URL')),
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}

/**
 * Rate limit decorator for controllers/methods
 * 
 * @usage
 * @Controller('auth')
 * export class AuthController {
 *   @Post('login')
 *   @Throttle({ default: { limit: 5, ttl: 60000 } })
 *   async login() { }
 *   
 *   @Post('register')
 *   @Throttle({ default: { limit: 10, ttl: 60000 } })
 *   async register() { }
 * }
 */
export { Throttle } from '@nestjs/throttler';

/**
 * Skip rate limit decorator for trusted IPs or internal routes
 * 
 * @usage
 * @Get('health')
 * @SkipThrottle()
 * async healthCheck() { }
 */
export { SkipThrottle } from '@nestjs/throttler';

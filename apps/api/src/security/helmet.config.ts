/**
 * Helmet Security Headers Configuration
 * 
 * Implements comprehensive HTTP security headers:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - XSS Protection
 * - Referrer Policy
 * - Cross-Origin policies
 * 
 * @see https://helmetjs.github.io/
 */

import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

/**
 * Helmet configuration for production-grade security
 */
export function getHelmetConfig(configService: ConfigService) {
  const isProd = configService.get('NODE_ENV') === 'production';
  const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:3001');
  const apiUrl = configService.get('API_URL', 'http://localhost:3000');
  const minioUrl = configService.get('MINIO_PUBLIC_URL', 'http://localhost:9000');
  const allowedOrigins = configService.get('ALLOWED_ORIGINS', '');

  // Parse additional allowed origins
  const additionalOrigins = allowedOrigins
    .split(',')
    .map(url => url.trim())
    .filter(Boolean);

  const allOrigins = [
    "'self'",
    frontendUrl.replace(/^https?:\/\//, ''),
    apiUrl.replace(/^https?:\/\//, ''),
    minioUrl.replace(/^https?:\/\//, ''),
    ...additionalOrigins.map(url => url.replace(/^https?:\/\//, '')),
  ].filter(Boolean);

  return helmet({
    /**
     * Content Security Policy
     * Controls which resources can be loaded from which origins
     */
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        
        // Scripts
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Next.js
          "'unsafe-eval'",   // Required for Next.js dev mode
          'https://cdn.tailwindcss.com',
        ],
        
        // Styles
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for inline styles
          'https://fonts.googleapis.com',
        ],
        
        // Fonts
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
        ],
        
        // Images
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          minioUrl,
          'https://images.unsplash.com',
        ],
        
        // API connections
        connectSrc: [
          "'self'",
          apiUrl,
          frontendUrl,
          minioUrl,
          'wss://realtime.lovnge.ru', // WebSocket endpoint
        ],
        
        // Frames (disable framing to prevent clickjacking)
        frameSrc: ["'none'"],
        
        // Objects (disable Flash, etc.)
        objectSrc: ["'none'"],
        
        // Upgrade insecure requests (production only)
        ...(isProd && {
          upgradeInsecureRequests: [],
        }),
      },
    },

    /**
     * HTTP Strict Transport Security
     * Forces HTTPS for all future requests
     */
    hsts: isProd ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    } : false,

    /**
     * Prevent MIME type sniffing
     */
    noSniff: true,

    /**
     * XSS Filter (legacy browsers)
     */
    xssFilter: true,

    /**
     * Referrer Policy
     * Controls how much referrer information is sent
     */
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    /**
     * Cross-Origin Embedder Policy
     * Prevents loading cross-origin resources without explicit permission
     */
    crossOriginEmbedderPolicy: false, // Adjust based on your needs

    /**
     * Cross-Origin Resource Policy
     */
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },

    /**
     * Cross-Origin Opener Policy
     */
    crossOriginOpenerPolicy: {
      policy: 'same-origin-allow-popups',
    },

    /**
     * DNS Prefetch Control
     * Disable to prevent DNS leaks
     */
    dnsPrefetchControl: {
      allow: false,
    },

    /**
     * Frameguard (Clickjacking protection)
     */
    frameguard: {
      action: 'deny',
    },

    /**
     * Hide X-Powered-By header
     */
    hidePoweredBy: true,

    /**
     * IE No Open
     * Prevents IE from executing downloads in site's context
     */
    ieNoOpen: true,

    /**
     * Permitted Cross-Domain Policies
     */
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
  });
}

/**
 * Security headers middleware factory
 * Can be used directly in Express/Fastify
 */
export function securityMiddleware(configService: ConfigService) {
  return getHelmetConfig(configService);
}

/**
 * Content Security Policy report handler
 * Logs CSP violations for monitoring
 */
export function cspReportHandler(req: any, res: any, next: any) {
  if (req.method === 'POST' && req.path === '/api/security/csp-report') {
    console.error('CSP Violation:', req.body);
    // Log to monitoring service (Sentry, etc.)
    res.sendStatus(200);
  } else {
    next();
  }
}

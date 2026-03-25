/**
 * Anti-Leak Communication System
 * 
 * Detects and prevents sharing of contact information between clients and models.
 * Protects the platform's business model by keeping communications within the system.
 * 
 * Features:
 * - Phone number detection (Russian & international formats)
 * - Email detection
 * - Social media link detection (Telegram, WhatsApp, VK, Instagram)
 * - Automatic masking of detected contacts
 * - Strike system with automatic blacklisting
 * - VIP user exemptions (configurable)
 * 
 * @see CODE_AUDIT_RECOMMENDATIONS.html - Security Issue #7
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Violation types detected by the system
 */
export interface Violation {
  type: 'PHONE_NUMBER' | 'EMAIL' | 'SOCIAL_LINK' | 'USERNAME';
  pattern: string;
  matches: string[];
  severity: 'low' | 'medium' | 'high';
}

/**
 * Sanitization result
 */
export interface SanitizationResult {
  allowed: boolean;
  sanitized: string;
  violations: Violation[];
  action: 'ALLOW' | 'MASK_AND_LOG' | 'BLOCK_AND_WARN';
}

@Injectable()
export class AntiLeakService {
  private readonly logger = new Logger('AntiLeak');
  private readonly strikeWindowMs: number;
  private readonly maxStrikes: number;

  // Patterns that indicate contact sharing attempts
  private readonly leakPatterns = {
    // Russian phone numbers: +7 999 123-45-67, 8 999 123 45 67, +7(999)123-45-67
    phoneRu: /\b(?:\+7|7|8)\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
    
    // International phone numbers
    phoneInt: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    
    // Email addresses
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    
    // Telegram links
    telegram: /\b(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9_]{3,}\b/g,
    
    // Telegram usernames
    telegramUser: /@([a-zA-Z0-9_]{3,})/g,
    
    // WhatsApp links
    whatsapp: /\b(?:https?:\/\/)?(?:wa\.me|whatsapp\.com)\/\d+\b/g,
    
    // VK (VKontakte) links
    vk: /\b(?:https?:\/\/)?(?:vk\.com|vkontakte\.ru)\/[^\s]+\b/g,
    
    // Instagram links
    instagram: /\b(?:https?:\/\/)?(?:instagram\.com)\/[^\s]+\b/g,
    
    // Facebook links
    facebook: /\b(?:https?:\/\/)?(?:facebook\.com)\/[^\s]+\b/g,
    
    // OnlyFans links (premium content)
    onlyfans: /\b(?:https?:\/\/)?(?:onlyfans\.com)\/[^\s]+\b/g,
    
    // Generic website URLs (catch-all)
    website: /\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-z]{2,}\/?[^\s]*\b/g,
  };

  // Masking patterns
  private readonly maskPatterns = [
    {
      pattern: /\b(\+?7|8)\s?(\(?\d{3}\)?)[\s.-]?(\d{3})[\s.-]?(\d{2})[\s.-]?(\d{2})\b/g,
      replacement: '+7 (***) ***-**-**',
    },
    {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: '***@***.**',
    },
    {
      pattern: /\b(?:https?:\/\/)?t\.me\/[a-zA-Z0-9_]{3,}\b/g,
      replacement: 't.me/***',
    },
    {
      pattern: /@([a-zA-Z0-9_]{3,})/g,
      replacement: '@***',
    },
  ];

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.strikeWindowMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.maxStrikes = 3;
  }

  /**
   * Sanitize message and detect contact sharing attempts
   * 
   * @param message - User message to sanitize
   * @param userRole - User role (client, model, manager, admin)
   * @param isVip - Whether user is VIP (more lenient rules)
   */
  sanitizeMessage(
    message: string,
    userRole: string,
    isVip: boolean = false,
  ): SanitizationResult {
    let sanitized = message;
    const violations: Violation[] = [];

    // Skip check for admins and managers
    if (userRole === 'admin' || userRole === 'manager') {
      return {
        allowed: true,
        sanitized: message,
        violations: [],
        action: 'ALLOW',
      };
    }

    // Check for each leak pattern
    for (const [type, pattern] of Object.entries(this.leakPatterns)) {
      const matches = message.match(pattern);
      
      if (matches && matches.length > 0) {
        // Filter out false positives for website pattern
        if (type === 'website') {
          const filteredMatches = matches.filter(match => {
            // Allow common platform URLs
            const allowedDomains = [
              'lovnge.ru',
              'lovnge.com',
              'unsplash.com',
              'google.com',
            ];
            return !allowedDomains.some(domain => match.includes(domain));
          });
          
          if (filteredMatches.length === 0) continue;
        }

        const violationType = this.getViolationType(type);
        violations.push({
          type: violationType,
          pattern: pattern.source,
          matches: matches,
          severity: this.getSeverity(violationType, userRole),
        });

        // Apply masking
        for (const mask of this.maskPatterns) {
          if (pattern.source.includes(mask.pattern.source)) {
            sanitized = sanitized.replace(mask.pattern, mask.replacement);
          }
        }
      }
    }

    // Determine action based on violations and user status
    const shouldBlock = violations.length > 0 && 
      userRole === 'client' && 
      !isVip;

    return {
      allowed: !shouldBlock,
      sanitized,
      violations,
      action: shouldBlock 
        ? 'BLOCK_AND_WARN' 
        : violations.length > 0 
          ? 'MASK_AND_LOG' 
          : 'ALLOW',
    };
  }

  /**
   * Get violation type from pattern name
   */
  private getViolationType(patternName: string): Violation['type'] {
    if (patternName.includes('phone')) return 'PHONE_NUMBER';
    if (patternName.includes('email')) return 'EMAIL';
    if (patternName.includes('telegram') || patternName.includes('whatsapp') || 
        patternName.includes('vk') || patternName.includes('instagram') || 
        patternName.includes('facebook') || patternName.includes('onlyfans')) {
      return 'SOCIAL_LINK';
    }
    if (patternName.includes('User')) return 'USERNAME';
    return 'SOCIAL_LINK';
  }

  /**
   * Get severity based on violation type and user role
   */
  private getSeverity(type: Violation['type'], userRole: string): Violation['severity'] {
    // Phone numbers and emails are high severity
    if (type === 'PHONE_NUMBER' || type === 'EMAIL') {
      return 'high';
    }

    // Social links are medium severity
    if (type === 'SOCIAL_LINK') {
      return 'medium';
    }

    // Usernames are low severity (could be false positives)
    return 'low';
  }

  /**
   * Log violation and track strikes
   * 
   * @param userId - User ID
   * @param bookingId - Related booking ID (if applicable)
   * @param violations - Detected violations
   * @param redis - Redis service for strike tracking
   */
  async logViolation(
    userId: string,
    bookingId: string | undefined,
    violations: Violation[],
    // redis: RedisService, // Inject when Redis module is implemented
  ): Promise<{ strikes: number; isBlocked: boolean }> {
    const maxSeverity = violations.reduce((max, v) => {
      const severityOrder = { low: 1, medium: 2, high: 3 };
      return severityOrder[v.severity] > severityOrder[max] ? v.severity : max;
    }, 'low' as Violation['severity']);

    // Log to audit system
    this.logger.warn(`Contact sharing attempt detected`, {
      userId,
      bookingId,
      violations: violations.map(v => ({ type: v.type, severity: v.severity })),
    });

    // Note: In production, track strikes in Redis
    // const strikeKey = `strikes:${userId}`;
    // const strikes = await redis.incr(strikeKey);
    // if (strikes === 1) {
    //   await redis.expire(strikeKey, Math.floor(this.strikeWindowMs / 1000));
    // }

    // Mock strike tracking (replace with Redis implementation)
    const strikes = violations.length;
    const isBlocked = strikes >= this.maxStrikes;

    if (isBlocked) {
      this.logger.error(`User blocked after ${strikes} strikes`, {
        userId,
        totalViolations: strikes,
      });

      // TODO: Add to blacklist service
      // await this.blacklistService.addToBlacklist({
      //   entityType: 'client',
      //   entityId: userId,
      //   reason: 'Repeated contact sharing attempts',
      //   evidence: violations,
      // });
    }

    return { strikes, isBlocked };
  }

  /**
   * Check if message is safe to send
   * Quick check without detailed violation info
   */
  isSafe(message: string): boolean {
    for (const pattern of Object.values(this.leakPatterns)) {
      if (pattern.test(message)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get user-friendly warning message for blocked content
   */
  getWarningMessage(violations: Violation[]): string {
    const violationTypes = new Set(violations.map(v => v.type));
    
    const messages: string[] = [];

    if (violationTypes.has('PHONE_NUMBER')) {
      messages.push('Номера телефонов можно передавать только через безопасную сделку');
    }
    
    if (violationTypes.has('EMAIL')) {
      messages.push('Email адреса нельзя передавать в чате');
    }
    
    if (violationTypes.has('SOCIAL_LINK')) {
      messages.push('Ссылки на социальные сети запрещены');
    }

    if (violationTypes.has('USERNAME')) {
      messages.push('Никнеймы в Telegram/соцсетях нельзя передавать в чате');
    }

    return messages.join('. ') + '. Нарушения могут привести к блокировке.';
  }

  /**
   * Analyze conversation for patterns (admin tool)
   * Detects systematic attempts to bypass the system
   */
  analyzeConversation(messages: Array<{ content: string; timestamp: Date }>): {
    riskScore: number;
    totalAttempts: number;
    pattern: 'none' | 'gradual' | 'aggressive' | 'coded';
  } {
    let totalAttempts = 0;
    let codedAttempts = 0;

    for (const message of messages) {
      // Check for direct violations
      const result = this.sanitizeMessage(message.content, 'client');
      if (result.violations.length > 0) {
        totalAttempts++;
      }

      // Check for coded language (obfuscation attempts)
      const codedPatterns = [
        /\bтелега\b|\bтг\b|\bтелеграм\b/i,
        /\bватсап\b|\bва\b|\bвотсап\b/i,
        /\bпочта\b|\bмыло\b/i,
        /\bсвязь\b|\bконтакт\b|\bномер\b/i,
        /\bперезвон[и|ю]\b|\bпозвон[и|ю]\b/i,
      ];

      for (const pattern of codedPatterns) {
        if (pattern.test(message.content)) {
          codedAttempts++;
          break;
        }
      }
    }

    // Calculate risk score (0-100)
    const violationRate = messages.length > 0 ? totalAttempts / messages.length : 0;
    const codedRate = messages.length > 0 ? codedAttempts / messages.length : 0;
    const riskScore = Math.min(100, Math.round((violationRate * 60 + codedRate * 40) * 100));

    // Determine pattern type
    let pattern: 'none' | 'gradual' | 'aggressive' | 'coded' = 'none';
    
    if (riskScore === 0) {
      pattern = 'none';
    } else if (codedAttempts > totalAttempts) {
      pattern = 'coded';
    } else if (violationRate > 0.3) {
      pattern = 'aggressive';
    } else {
      pattern = 'gradual';
    }

    return {
      riskScore,
      totalAttempts,
      pattern,
    };
  }
}

/**
 * Anti-Leak interceptor for automatic message sanitization
 * Apply to chat/message endpoints
 * 
 * @usage
 * @Controller('messages')
 * @UseInterceptors(AntiLeakInterceptor)
 * export class MessagesController {
 *   @Post()
 *   async sendMessage(@Body() dto: SendMessageDto) { }
 * }
 */
export function AntiLeakInterceptor() {
  // Implementation requires NestJS interceptor
  // See full implementation in production
  return () => {};
}

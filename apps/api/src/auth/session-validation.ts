import { UnauthorizedException } from '@nestjs/common';

export interface SessionClaims {
  iat?: number;
  sessionStamp?: number;
}

export interface SessionUser {
  status: string;
  tokensValidAfter?: Date | null;
}

/** Existing timestamp acts as a millisecond session version; no schema change. */
export function sessionStamp(value?: Date | null): number {
  const stamp = value ? new Date(value).getTime() : 0;
  if (!Number.isSafeInteger(stamp) || stamp < 0) {
    throw new UnauthorizedException('Invalid session version');
  }
  return stamp;
}

export function assertSessionActive(payload: SessionClaims, user?: SessionUser | null): asserts user is SessionUser {
  if (!user) throw new UnauthorizedException('User not found');
  if (['suspended', 'blacklisted'].includes(user.status)) {
    throw new UnauthorizedException('Account is blocked');
  }

  const current = sessionStamp(user.tokensValidAfter);
  if (payload.sessionStamp !== undefined) {
    if (!Number.isSafeInteger(payload.sessionStamp) || payload.sessionStamp !== current) {
      throw new UnauthorizedException('Session revoked');
    }
    return;
  }

  // Legacy JWTs only have second-resolution iat. Reject the entire revoked
  // second: a legacy token cannot prove it was issued after that revocation.
  // New login/recovery tokens use sessionStamp and work in the same second.
  if (!Number.isSafeInteger(payload.iat) || (current > 0 && payload.iat! <= Math.floor(current / 1000))) {
    throw new UnauthorizedException('Session revoked');
  }
}

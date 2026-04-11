import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

const HEADER = 'x-ton-escrow-ingest';

@Injectable()
export class TonEscrowDepositGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('TON_ESCROW_INGEST_SECRET');
    if (!expected || expected.length < 16) {
      throw new ServiceUnavailableException(
        'TON escrow deposit ingest is disabled (set TON_ESCROW_INGEST_SECRET, min 16 chars)',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const got = req.headers[HEADER];
    if (typeof got !== 'string' || got.length === 0) {
      throw new UnauthorizedException(`Missing ${HEADER} header`);
    }

    const a = Buffer.from(got, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid ingest secret');
    }

    return true;
  }
}

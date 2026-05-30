/**
 * CreateWfyPartnerSalonDto — validation spec (Productor-debt: externalLink whitelist).
 *
 * externalLink принимает только http/https с обязательным протоколом
 * (`@IsUrl({ require_protocol: true, protocols: ['http','https'] })`). Это
 * закрывает XSS-вектор `javascript:` / `data:` URL, попадающих в href на
 * публичной странице партнёра. Тест фиксирует инвариант как regression-guard.
 *
 * Чистый DTO-тест: class-transformer + class-validator, без Nest-контекста.
 */
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreateWfyPartnerSalonDto } from './create-wfy-partner-salon.dto';

function externalLinkErrors(value: unknown): boolean {
  const dto = plainToInstance(CreateWfyPartnerSalonDto, { name: 'P', externalLink: value });
  return validateSync(dto).some((e) => e.property === 'externalLink');
}

describe('CreateWfyPartnerSalonDto · externalLink whitelist', () => {
  it.each([
    'javascript:alert(1)',
    'javascript:void(0)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.com/x',
    'imperiumspa.ru', // no protocol
    '//imperiumspa.ru', // protocol-relative
  ])('rejects %p', (value) => {
    expect(externalLinkErrors(value)).toBe(true);
  });

  it.each(['https://imperiumspa.ru', 'http://imperiumspa.ru/path?q=1'])(
    'accepts %p',
    (value) => {
      expect(externalLinkErrors(value)).toBe(false);
    },
  );

  it('omitted externalLink is valid (optional)', () => {
    const dto = plainToInstance(CreateWfyPartnerSalonDto, { name: 'P' });
    expect(validateSync(dto).some((e) => e.property === 'externalLink')).toBe(false);
  });
});

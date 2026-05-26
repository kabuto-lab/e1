/**
 * safe-fetch.spec.ts — ADR-003 IMPL-B · SSRF allow-list coverage.
 *
 * Verifies that safeFetch's policy layer (validateAndResolve + helpers)
 * blocks every threat class enumerated in ADR-003 §F-S1..F-S4:
 *
 *   F-S1 · TOCTOU between DNS resolve and connect → IP-pinning (covered by
 *          architecture, not directly testable without integration; we
 *          assert that ALL resolved IPs are validated, not just the first).
 *   F-S2 · IPv4-mapped IPv6 bypass (::ffff:10.0.0.1) → normaliser test.
 *   F-S3 · Service-name DNS (postgres, minio) → literal hostname block.
 *   F-S4 · Operator-misconfigured WP_IMPORT_EXTRA_PORTS=* → validation throws.
 *
 * Plus every block class from §Decision:
 *   - BLOCKED_SCHEME: file://, gopher://, ftp://, data:, javascript:
 *   - INVALID_URL  : malformed strings
 *   - BLOCKED_HOST : compose-network names
 *   - BLOCKED_IP   : RFC1918 + link-local + loopback + IPv6 reserved
 *   - BLOCKED_PORT : 5432 (Postgres), 9000 (MinIO), 6379 (Redis), 22 (SSH)
 *   - DNS_FAILURE  : NXDOMAIN propagates as SafeFetchError
 *
 * Out of scope for this spec (integration concern, deferred):
 *   - end-to-end fetch against a real HTTP server (would need testcontainers)
 *   - redirect-loop behaviour (mocked rawFetch path would duplicate logic)
 *   - Content-Type rejection (same — needs real or mocked response)
 *   - Body-size cap streaming abort (same)
 *
 * Refs:
 *   - governance/adr/ADR-003-wp-import-ssrf-allowlist.md (Accepted 2026-05-26)
 *   - safe-fetch.ts (IMPL-A)
 */
import { promises as dns } from 'node:dns';
import { SafeFetchError, __testing } from './safe-fetch';

const { ipv4ToInt, parseCidr4, isBlockedIPv4, isBlockedIPv6, ipv4MappedToV4,
  validateAndResolve, resetCachedPorts } = __testing;

describe('safe-fetch · IP helpers', () => {
  describe('ipv4ToInt', () => {
    it('round-trips a known address', () => {
      expect(ipv4ToInt('127.0.0.1')).toBe(0x7f000001);
      expect(ipv4ToInt('0.0.0.0')).toBe(0);
      expect(ipv4ToInt('255.255.255.255')).toBe(0xffffffff);
      expect(ipv4ToInt('169.254.169.254')).toBe(0xa9fea9fe);
    });
    it('rejects malformed', () => {
      expect(ipv4ToInt('not-an-ip')).toBeNull();
      expect(ipv4ToInt('256.1.1.1')).toBeNull();
      expect(ipv4ToInt('1.1.1')).toBeNull();
      expect(ipv4ToInt('1.1.1.1.1')).toBeNull();
    });
  });

  describe('parseCidr4', () => {
    it('parses a /8 with bitmask-normalized base', () => {
      const c = parseCidr4('10.0.0.0/8');
      expect(c).not.toBeNull();
      expect(c!.mask >>> 0).toBe(0xff000000);
      // 10.x.x.x should match
      expect((ipv4ToInt('10.42.42.42')! & c!.mask)).toBe(c!.base);
    });
    it('rejects malformed CIDR', () => {
      expect(parseCidr4('not-cidr')).toBeNull();
      expect(parseCidr4('1.2.3.4/99')).toBeNull();
      expect(parseCidr4('1.2.3.4/-1')).toBeNull();
    });
  });

  describe('isBlockedIPv4 — every RFC1918 + reserved class', () => {
    it.each([
      ['10.0.0.1', 'RFC1918 10.0.0.0/8'],
      ['10.255.255.255', 'RFC1918 edge'],
      ['172.16.0.1', 'RFC1918 172.16.0.0/12'],
      ['172.31.255.254', 'RFC1918 172.16/12 edge'],
      ['192.168.1.1', 'RFC1918 192.168.0.0/16'],
      ['127.0.0.1', 'loopback'],
      ['127.255.255.254', 'loopback edge'],
      ['169.254.169.254', 'link-local / cloud metadata (AWS/GCP)'],
      ['0.0.0.0', '"this network"'],
      ['224.0.0.1', 'multicast'],
      ['255.255.255.255', 'limited broadcast'],
      ['100.64.0.1', 'CGNAT 100.64.0.0/10'],
      ['198.18.0.1', 'benchmarking 198.18.0.0/15'],
    ])('blocks %s (%s)', (ip) => {
      expect(isBlockedIPv4(ip)).toBe(true);
    });

    it.each([
      ['8.8.8.8', 'Google DNS — public'],
      ['1.1.1.1', 'Cloudflare DNS — public'],
      ['151.101.1.140', 'random public CDN'],
    ])('allows public %s', (ip) => {
      expect(isBlockedIPv4(ip)).toBe(false);
    });

    it('blocks malformed addresses (fail-closed)', () => {
      expect(isBlockedIPv4('garbage')).toBe(true);
      expect(isBlockedIPv4('999.999.999.999')).toBe(true);
    });
  });

  describe('isBlockedIPv6', () => {
    it.each([
      ['::', 'unspecified'],
      ['::1', 'loopback'],
      ['fe80::1', 'link-local'],
      ['fc00::1', 'unique local'],
      ['fd12:3456::1', 'ULA'],
      ['ff02::1', 'multicast'],
    ])('blocks %s (%s)', (ip) => {
      expect(isBlockedIPv6(ip)).toBe(true);
    });

    it.each([
      ['2606:4700:4700::1111', 'Cloudflare public v6'],
      ['2001:4860:4860::8888', 'Google public v6'],
    ])('allows public %s', (ip) => {
      expect(isBlockedIPv6(ip)).toBe(false);
    });
  });

  describe('F-S2 · IPv4-mapped IPv6 normaliser', () => {
    it('extracts dotted-quad form', () => {
      expect(ipv4MappedToV4('::ffff:127.0.0.1')).toBe('127.0.0.1');
      expect(ipv4MappedToV4('::ffff:10.0.0.1')).toBe('10.0.0.1');
    });
    it('extracts hex-pair form', () => {
      // ::ffff:0a00:0001 = ::ffff:10.0.0.1
      expect(ipv4MappedToV4('::ffff:0a00:0001')).toBe('10.0.0.1');
    });
    it('returns null for non-mapped v6', () => {
      expect(ipv4MappedToV4('2606:4700::1')).toBeNull();
      expect(ipv4MappedToV4('::1')).toBeNull();
    });
    it('isBlockedIPv6 catches mapped-to-private', () => {
      expect(isBlockedIPv6('::ffff:127.0.0.1')).toBe(true);
      expect(isBlockedIPv6('::ffff:10.0.0.1')).toBe(true);
      expect(isBlockedIPv6('::ffff:169.254.169.254')).toBe(true);
      // Public v4 wrapped → still public
      expect(isBlockedIPv6('::ffff:8.8.8.8')).toBe(false);
    });
  });
});

// ── validateAndResolve — block-class coverage ────────────────────────────────

describe('safe-fetch · validateAndResolve', () => {
  let lookupSpy: jest.SpyInstance;

  beforeEach(() => {
    resetCachedPorts();
    delete process.env.WP_IMPORT_EXTRA_PORTS;
    lookupSpy = jest.spyOn(dns, 'lookup');
  });

  afterEach(() => {
    lookupSpy.mockRestore();
  });

  describe('BLOCKED_SCHEME', () => {
    it.each([
      ['file:///etc/passwd'],
      ['ftp://example.com/'],
      ['gopher://example.com/'],
      ['dict://example.com/'],
      ['data:text/plain,abc'],
      ['javascript:alert(1)'],
    ])('rejects %s', async (url) => {
      await expect(validateAndResolve(url)).rejects.toMatchObject({
        code: 'BLOCKED_SCHEME',
      });
    });
  });

  describe('INVALID_URL', () => {
    it('rejects malformed', async () => {
      await expect(validateAndResolve('not a url')).rejects.toMatchObject({
        code: 'INVALID_URL',
      });
    });
    // NB: WHATWG URL parser handles edge cases like `http:///path` by
    // normalizing rather than throwing — those reach the DNS layer and
    // fail with DNS_FAILURE (also a SafeFetchError, fail-closed). The
    // 'not a url' test above covers the parse-error path.
  });

  describe('F-S3 · BLOCKED_HOST literal compose-service names', () => {
    it.each([
      ['http://postgres/'],
      ['http://minio/x'],
      ['http://redis/y'],
      ['http://mailhog/z'],
      ['http://localhost/q'],
      ['http://host.docker.internal/r'],
    ])('rejects %s before DNS', async (url) => {
      await expect(validateAndResolve(url)).rejects.toMatchObject({
        code: 'BLOCKED_HOST',
      });
      // Ensures we never even hit DNS for these.
      expect(lookupSpy).not.toHaveBeenCalled();
    });
  });

  describe('BLOCKED_IP — literal IPs in URL', () => {
    it.each([
      ['http://127.0.0.1/'],
      ['http://10.0.0.1/'],
      ['http://192.168.1.1/'],
      ['http://169.254.169.254/latest/meta-data/'],
      ['http://172.20.0.5/'],
    ])('rejects %s without DNS', async (url) => {
      await expect(validateAndResolve(url)).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      });
      expect(lookupSpy).not.toHaveBeenCalled();
    });

    it('rejects IPv4-mapped IPv6 literal', async () => {
      await expect(validateAndResolve('http://[::ffff:10.0.0.1]/')).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      });
    });
  });

  describe('BLOCKED_PORT', () => {
    it.each([
      ['http://example.com:5432/', 5432],
      ['http://example.com:9000/', 9000],
      ['http://example.com:6379/', 6379],
      ['http://example.com:22/', 22],
    ])('rejects %s (port %i)', async (url) => {
      await expect(validateAndResolve(url)).rejects.toMatchObject({
        code: 'BLOCKED_PORT',
      });
    });

    it('allows operator-opted-in extra port', async () => {
      process.env.WP_IMPORT_EXTRA_PORTS = '8080';
      resetCachedPorts();
      lookupSpy.mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as never);
      const target = await validateAndResolve('http://example.com:8080/');
      expect(target.port).toBe(8080);
    });

    it('F-S4 · refuses too many extra ports', () => {
      process.env.WP_IMPORT_EXTRA_PORTS = '8080,8081,8082,8083,8084,8085';
      resetCachedPorts();
      expect(() => __testing.getAllowedPorts()).toThrow(SafeFetchError);
    });

    it('F-S4 · refuses non-integer extra port', () => {
      process.env.WP_IMPORT_EXTRA_PORTS = '8080,not-a-number';
      resetCachedPorts();
      expect(() => __testing.getAllowedPorts()).toThrow(SafeFetchError);
    });
  });

  describe('BLOCKED_IP via DNS resolution', () => {
    it('rejects hostname that resolves to RFC1918', async () => {
      lookupSpy.mockResolvedValue([
        { address: '10.0.0.5', family: 4 },
      ] as never);
      await expect(validateAndResolve('http://attacker.com/')).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      });
    });

    it('rejects hostname that resolves to AWS metadata IP', async () => {
      lookupSpy.mockResolvedValue([
        { address: '169.254.169.254', family: 4 },
      ] as never);
      await expect(validateAndResolve('http://meta.fake/')).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      });
    });

    it('rejects MIXED records (one allowed, one blocked) — fails closed', async () => {
      // Attacker can craft DNS with public + private; we MUST reject so
      // an IP-pin selecting the public still has the underlying name
      // mapped to private — defeats partial allow.
      lookupSpy.mockResolvedValue([
        { address: '8.8.8.8', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ] as never);
      await expect(validateAndResolve('http://attacker.com/')).rejects.toMatchObject({
        code: 'BLOCKED_IP',
      });
    });

    it('rejects when DNS lookup fails', async () => {
      lookupSpy.mockRejectedValue(new Error('ENOTFOUND'));
      await expect(validateAndResolve('http://nonexistent.invalid/')).rejects.toMatchObject({
        code: 'DNS_FAILURE',
      });
    });

    it('rejects when DNS returns empty record set', async () => {
      lookupSpy.mockResolvedValue([] as never);
      await expect(validateAndResolve('http://empty.fake/')).rejects.toMatchObject({
        code: 'DNS_FAILURE',
      });
    });

    it('allows hostname with all-public records, pins first IP', async () => {
      lookupSpy.mockResolvedValue([
        { address: '1.1.1.1', family: 4 },
        { address: '8.8.8.8', family: 4 },
      ] as never);
      const target = await validateAndResolve('http://cloudflare.com/');
      expect(target.ip).toBe('1.1.1.1');
      expect(target.host).toBe('cloudflare.com');
      expect(target.family).toBe(4);
    });
  });
});

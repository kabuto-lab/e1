import * as ipaddr from 'ipaddr.js';

/**
 * IP allow-list / block-list helpers for safeFetch (SSRF defence — NAS ADR-003).
 *
 * Block-list strategy: every CIDR that could refer to internal infrastructure
 * (private, loopback, link-local, multicast, reserved). IPv4-mapped IPv6
 * addresses are normalised to v4 first to defeat the `::ffff:10.0.0.1` bypass.
 *
 * Harvested from the Replikant migrator; INTERNAL_HOSTNAMES retargeted to NAS
 * docker-compose service names.
 */

const IPV4_BLOCKED_CIDRS: ReadonlyArray<[string, number]> = [
  ['0.0.0.0', 8],          // current network
  ['10.0.0.0', 8],          // RFC1918 private
  ['100.64.0.0', 10],       // CGNAT
  ['127.0.0.0', 8],         // loopback
  ['169.254.0.0', 16],      // link-local (incl. AWS metadata 169.254.169.254)
  ['172.16.0.0', 12],       // RFC1918 private
  ['192.0.0.0', 24],        // protocol assignments
  ['192.0.2.0', 24],        // TEST-NET-1
  ['192.168.0.0', 16],      // RFC1918 private
  ['198.18.0.0', 15],       // benchmarking
  ['198.51.100.0', 24],     // TEST-NET-2
  ['203.0.113.0', 24],      // TEST-NET-3
  ['224.0.0.0', 4],          // multicast
  ['240.0.0.0', 4],          // reserved
  ['255.255.255.255', 32],   // broadcast
];

const IPV6_BLOCKED_CIDRS: ReadonlyArray<[string, number]> = [
  ['::', 128],                // unspecified
  ['::1', 128],               // loopback
  ['fc00::', 7],              // unique-local
  ['fe80::', 10],             // link-local
  ['ff00::', 8],              // multicast
  ['2001:db8::', 32],         // documentation
  ['64:ff9b::', 96],          // NAT64 well-known
  ['100::', 64],              // discard prefix
];

/**
 * Internal docker-compose service names that should never be resolved
 * regardless of DNS — they don't exist on public DNS but a malicious user
 * could craft `/etc/hosts` or a captive resolver to point them anywhere.
 */
const INTERNAL_HOSTNAMES = new Set<string>([
  'postgres',
  'redis',
  'minio',
  'mailhog',
  'barbie-site1-postgres',
  'barbie-site1-redis',
  'barbie-site1-minio',
  'barbie-site1-mailhog',
  'api',
  'web',
  'worker',
  'localhost',
  'host.docker.internal',
]);

export class BlockedHostError extends Error {
  constructor(public readonly host: string, public readonly reason: string) {
    super(`Blocked host "${host}": ${reason}`);
  }
}

/**
 * Throws BlockedHostError if the hostname is a literal block-listed service name.
 * Run BEFORE DNS resolution to short-circuit obvious internal targets.
 */
export function assertHostnameAllowed(hostname: string, extraAllowed: Set<string>): void {
  const lower = hostname.toLowerCase();
  if (extraAllowed.has(lower)) return;
  if (INTERNAL_HOSTNAMES.has(lower)) {
    throw new BlockedHostError(hostname, 'internal service name');
  }
  // Numeric IPv4/IPv6 hostname — defer to IP check.
  // Hostnames that LOOK like IPs are handled by parse + assertIpAllowed.
  if (ipaddr.isValid(hostname)) {
    assertIpAllowed(hostname);
  }
}

/**
 * Throws BlockedHostError if the IP address falls in a reserved/private range.
 * Normalises IPv4-mapped IPv6 (`::ffff:10.0.0.1` → `10.0.0.1`) before checking.
 */
export function assertIpAllowed(ipString: string): void {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(ipString);
  } catch {
    throw new BlockedHostError(ipString, 'unparseable IP address');
  }

  // Collapse v4-mapped-v6 to v4 first.
  if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
    parsed = (parsed as ipaddr.IPv6).toIPv4Address();
  }

  const blocked = parsed.kind() === 'ipv4' ? IPV4_BLOCKED_CIDRS : IPV6_BLOCKED_CIDRS;
  for (const [rangeIp, prefix] of blocked) {
    const range = ipaddr.parse(rangeIp);
    if (range.kind() !== parsed.kind()) continue;
    if (
      parsed.kind() === 'ipv4'
        ? (parsed as ipaddr.IPv4).match(range as ipaddr.IPv4, prefix)
        : (parsed as ipaddr.IPv6).match(range as ipaddr.IPv6, prefix)
    ) {
      throw new BlockedHostError(ipString, `IP in blocked range ${rangeIp}/${prefix}`);
    }
  }
}

export function parseExtraAllowedHosts(envValue: string): Set<string> {
  return new Set(
    envValue
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

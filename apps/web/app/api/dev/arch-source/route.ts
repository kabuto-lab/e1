import { readFile } from 'fs/promises';
import { normalize, relative, resolve } from 'path';
import { NextRequest, NextResponse } from 'next/server';

/** Dev-only: отдаёт исходник файла для карты архитектуры (whitelist). */
const MAX_BYTES = 512 * 1024;

const ALLOWED_PREFIXES = ['apps/web/', 'apps/api/', 'packages/'];

const ALLOWED_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|css|scss|html|sql|prisma|toml)$/i;

function repoRoot(): string {
  return resolve(process.cwd(), '..', '..');
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const pathParam = req.nextUrl.searchParams.get('path');
  if (!pathParam) {
    return NextResponse.json({ error: 'Query "path" is required' }, { status: 400 });
  }

  let rel = normalize(pathParam.trim()).replace(/\\/g, '/');
  if (rel.startsWith('./')) rel = rel.slice(2);
  if (rel.includes('..') || rel.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const allowedPrefix = ALLOWED_PREFIXES.some((p) => rel === p.slice(0, -1) || rel.startsWith(p));
  if (!allowedPrefix || !ALLOWED_EXT.test(rel)) {
    return NextResponse.json({ error: 'Path not allowed' }, { status: 403 });
  }

  const root = repoRoot();
  const abs = resolve(root, rel);
  const fromRoot = relative(root, abs);
  if (fromRoot.startsWith('..') || fromRoot === '') {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const buf = await readFile(abs);
    const truncated = buf.length > MAX_BYTES;
    const slice = truncated ? buf.subarray(0, MAX_BYTES) : buf;
    const text = slice.toString('utf8');
    return NextResponse.json({
      content: truncated ? `${text}\n\n/* …truncated (file > ${MAX_BYTES} bytes) */` : text,
      truncated,
      path: rel,
    });
  } catch {
    return NextResponse.json({ error: 'File not found or not readable' }, { status: 404 });
  }
}

import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Явная отдача /escrow.html: на VPS Next иногда стартует с cwd = корень монорепо,
 * тогда встроенный раздачик public/ не находит apps/web/public — маршрут читает файл по фиксированному пути.
 */
export async function GET() {
  try {
    const cwd = process.cwd();
    const candidates = [
      join(cwd, 'public', 'escrow.html'),
      join(cwd, 'apps', 'web', 'public', 'escrow.html'),
    ];
    let html: string | null = null;
    for (const p of candidates) {
      try {
        html = await readFile(p, 'utf-8');
        break;
      } catch {
        /* next path */
      }
    }
    if (!html) {
      return new NextResponse('escrow.html not found on server', { status: 404 });
    }
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}

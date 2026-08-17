import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const enabled = process.env.NODE_ENV !== 'production' || process.env.VISUAL_LAB_ENABLED === 'true';
  if (!enabled) return new NextResponse(null, { status: 404 });

  const candidates = [
    path.resolve(process.cwd(), 'docs/ui-references/conexao-maconica/empresa-bronze.png'),
    path.resolve(process.cwd(), '../../docs/ui-references/conexao-maconica/empresa-bronze.png'),
  ];
  for (const candidate of candidates) {
    try {
      const image = await readFile(candidate);
      return new NextResponse(image, {
        headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
      });
    } catch {
      // Try the next workspace-relative path.
    }
  }
  return new NextResponse(null, { status: 404 });
}

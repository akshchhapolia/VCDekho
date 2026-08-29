import fs from 'fs';
import path from 'path';

export function htmlFileResponse(...parts: string[]) {
  const candidates = [
    path.join(process.cwd(), ...parts),
    path.join(process.cwd(), 'public', ...parts)
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return new Response(fs.readFileSync(file, 'utf8'), {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'public, max-age=180, s-maxage=86400, stale-while-revalidate=604800',
            'cdn-cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800'
          }
        });
      }
    } catch {
      /* try next */
    }
  }
  return new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}

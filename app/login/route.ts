import { htmlFileResponse } from '../../lib/html-file-response';

export function GET() {
  const res = htmlFileResponse('login.html');
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'private, no-store');
  headers.set('cdn-cache-control', 'private, no-store');
  return new Response(res.body, { status: res.status, headers });
}

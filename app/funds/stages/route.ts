import { htmlFileResponse } from '../../../lib/html-file-response';

export const dynamic = 'force-static';
export const revalidate = 86400;

export function GET() {
  return htmlFileResponse('funds/stages/index.html');
}

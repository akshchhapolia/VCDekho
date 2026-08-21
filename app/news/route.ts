import { htmlFileResponse } from '../../lib/html-file-response';

export function GET() {
  return htmlFileResponse('news/index.html');
}

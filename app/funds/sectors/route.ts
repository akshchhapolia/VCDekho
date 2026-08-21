import { htmlFileResponse } from '../../../lib/html-file-response';

export function GET() {
  return htmlFileResponse('funds/sectors/index.html');
}

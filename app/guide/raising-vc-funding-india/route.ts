import { htmlFileResponse } from '../../../lib/html-file-response';

export function GET() {
  return htmlFileResponse('guide', 'raising-vc-funding-india.html');
}

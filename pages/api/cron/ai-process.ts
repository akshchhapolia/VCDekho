import type { NextApiRequest, NextApiResponse } from 'next';

const handler = require('../../../server/cron/ai-process');

export const config = { maxDuration: 300 };

export default function api(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res);
}

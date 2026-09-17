import type { NextApiRequest, NextApiResponse } from 'next';

const handler = require('../../../server/admin/articles');

export default function api(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res);
}

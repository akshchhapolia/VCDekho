import type { NextApiRequest, NextApiResponse } from 'next';

const handler = require('../../../server/news/article');

export default function api(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res);
}

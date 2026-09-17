import type { NextApiRequest, NextApiResponse } from 'next';

const handler = require('../../../server/investors/detail');

export default function api(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res);
}

import type { Metadata } from 'next';
import { getFundsListPayload } from '../../../lib/directory-server';
import FundsDirectoryView from '../FundsDirectoryView';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Indian Funds Directory | VC Dekho',
  description:
    'Explore 1000+ VCs, family offices, angels and syndicates in India. Filter by sector, stage, cheque size, company type and investment thesis.',
  alternates: { canonical: 'https://vcdekho.com/funds' },
  openGraph: {
    title: 'Indian Funds Directory | VC Dekho',
    description: 'Explore 1000+ VCs, family offices, angels and syndicates in India.',
    url: 'https://vcdekho.com/funds'
  }
};

export default function FundsPage() {
  const payload = getFundsListPayload();
  const { rowsHtml, ...bootstrap } = payload;
  return <FundsDirectoryView total={payload.total} rowsHtml={rowsHtml} bootstrap={bootstrap} />;
}

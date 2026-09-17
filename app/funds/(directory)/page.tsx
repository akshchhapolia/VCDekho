import type { Metadata } from 'next';
import { getFundsDirectoryIndex, ensureDirectoryIndexFiles } from '../../../lib/directory-server';
import FundsDirectoryView from '../FundsDirectoryView';

export const dynamic = 'force-static';
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
  ensureDirectoryIndexFiles();
  const { investors, filters, total } = getFundsDirectoryIndex();
  return (
    <FundsDirectoryView investors={investors.slice(0, 15)} filters={filters} total={total} />
  );
}

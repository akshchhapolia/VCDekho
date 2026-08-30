import type { Metadata } from 'next';
import { getPeopleDirectoryIndex, ensureDirectoryIndexFiles } from '../../../lib/directory-server';
import PeopleDirectoryView from '../PeopleDirectoryView';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Investors Directory | VC Dekho',
  description:
    'Find partners, principals and angels at 700+ Indian VCs, family offices and accelerators. Filter by role, firm type, stage, sector, thesis and ticket size.',
  alternates: { canonical: 'https://vcdekho.com/investors' },
  openGraph: {
    title: 'Investors Directory | VC Dekho',
    description: 'Partners, principals and angels mapped to Indian funds.',
    url: 'https://vcdekho.com/investors'
  }
};

export default function InvestorsPage() {
  ensureDirectoryIndexFiles();
  const { people, filters, total } = getPeopleDirectoryIndex();
  return (
    <PeopleDirectoryView people={people.slice(0, 15)} filters={filters} total={total} />
  );
}

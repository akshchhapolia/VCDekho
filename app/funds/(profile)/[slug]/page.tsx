import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '../../../components/SiteHeader';
import { loadFundProfile } from '../../../../lib/profile';

export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = 86400;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadFundProfile(slug);
  if (!data || data.reserved) {
    return { title: 'Funds | VC Dekho' };
  }
  return {
    title: data.title as string,
    description: data.description as string,
    alternates: data.canonical ? { canonical: data.canonical as string } : undefined
  };
}

export default async function FundProfilePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const data = await loadFundProfile(slug);
  if (!data || data.reserved) notFound();
  return (
    <div className="app-container" key={slug}>
      <SiteHeader pathname={'/funds/' + slug} />
      <div dangerouslySetInnerHTML={{ __html: (data.mainHtml as string) || '' }} />
    </div>
  );
}

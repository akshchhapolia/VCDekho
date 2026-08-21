import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import DocumentClass from '../../components/DocumentClass';
import SiteHeader from '../../components/SiteHeader';
import { ProfileBoot } from '../../components/ClientRuntime';
import { loadFundProfile } from '../../../lib/profile-server';

export const revalidate = 86400;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const headerList = await headers();
  const data = await loadFundProfile(slug, headerList);
  if (!data || data.reserved) {
    return { title: 'Funds | VC Dekho' };
  }
  return {
    title: data.title,
    description: data.description,
    alternates: data.canonical ? { canonical: data.canonical } : undefined
  };
}

export default async function FundProfilePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const headerList = await headers();
  const data = await loadFundProfile(slug, headerList);
  if (!data || data.reserved) notFound();
  return (
    <>
      <DocumentClass htmlClass="scrollable-page" bodyClass={data.bodyClass || 'scrollable-page inv-page'} />
      <div className="app-container">
        <SiteHeader />
        <div dangerouslySetInnerHTML={{ __html: data.mainHtml || '' }} />
      </div>
      <ProfileBoot />
    </>
  );
}

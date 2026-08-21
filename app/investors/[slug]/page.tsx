import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import DocumentClass from '../../components/DocumentClass';
import SiteHeader from '../../components/SiteHeader';
import { ProfileBoot } from '../../components/ClientRuntime';
import { loadPersonProfile } from '../../../lib/profile-server';

export const revalidate = 86400;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const headerList = await headers();
  const data = await loadPersonProfile(slug, headerList);
  if (!data || data.redirectTo) {
    return { title: 'Investors | VC Dekho' };
  }
  return {
    title: data.title,
    description: data.description,
    alternates: data.canonical ? { canonical: data.canonical } : undefined
  };
}

export default async function PersonProfilePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const headerList = await headers();
  const data = await loadPersonProfile(slug, headerList);
  if (!data) notFound();
  if (data.redirectTo) redirect(data.redirectTo);
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

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import SiteHeader from '../../components/SiteHeader';
import { ProfileCss } from '../../components/PageCss';
import { ProfileBoot } from '../../components/ClientRuntime';
import { loadPersonProfile } from '../../../lib/profile';

export const revalidate = 86400;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPersonProfile(slug);
  if (!data || data.redirectTo) {
    return { title: 'Investors | VC Dekho' };
  }
  return {
    title: data.title as string,
    description: data.description as string,
    alternates: data.canonical ? { canonical: data.canonical as string } : undefined
  };
}

export default async function PersonProfilePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const data = await loadPersonProfile(slug);
  if (!data) notFound();
  if (data.redirectTo) redirect(data.redirectTo as string);
  return (
    <>
      <ProfileCss />
      <div className="app-container">
        <SiteHeader pathname={'/investors/' + slug} />
        <div dangerouslySetInnerHTML={{ __html: (data.mainHtml as string) || '' }} />
      </div>
      <ProfileBoot />
    </>
  );
}

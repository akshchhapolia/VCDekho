import { cache } from 'react';

const server = require('./profile-server') as {
  loadPersonProfile: (slug: string) => Promise<Record<string, unknown> | null>;
  loadFundProfile: (slug: string) => Promise<Record<string, unknown> | null>;
  listPersonSlugs: () => { slug: string }[];
  listFundSlugs: () => { slug: string }[];
};

export const loadPersonProfile = cache((slug: string) => server.loadPersonProfile(slug));
export const loadFundProfile = cache((slug: string) => server.loadFundProfile(slug));
export const listPersonSlugs = () => server.listPersonSlugs();
export const listFundSlugs = () => server.listFundSlugs();

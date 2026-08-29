const path = require('path');

const dataTrace = [
  './data/**/*',
  './utils/**/*',
  './utils/_data/**/*',
  './server/**/*',
  './login.html',
  './about.html',
  './contact.html',
  './login.js',
  './about.js',
  './contact.js',
  './blog/index.html',
  './news/index.html',
  './buzz/index.html',
  './guide/raising-vc-funding-india.html',
  './funds/stages/index.html',
  './funds/themes/index.html',
  './funds/sectors/index.html'
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 300
    }
  },
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingIncludes: {
    '/*': dataTrace
  },
  async headers() {
    const htmlCache = [
      {
        key: 'Cache-Control',
        value: 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'
      },
      {
        key: 'CDN-Cache-Control',
        value: 'public, s-maxage=86400, stale-while-revalidate=604800'
      }
    ];
    return [
      { source: '/', headers: htmlCache },
      { source: '/investors', headers: htmlCache },
      { source: '/funds', headers: htmlCache },
      { source: '/investors/:slug', headers: htmlCache },
      { source: '/funds/:slug', headers: htmlCache },
      { source: '/login', headers: htmlCache }
    ];
  },
  async redirects() {
    return [
      { source: '/waitlist', destination: '/login', permanent: true },
      { source: '/people', destination: '/investors', permanent: true },
      { source: '/people/:slug', destination: '/investors/:slug', permanent: true },
      { source: '/investors/stages', destination: '/funds/stages', permanent: true },
      { source: '/investors/stages/:slug*', destination: '/funds/stages/:slug*', permanent: true },
      { source: '/investors/themes', destination: '/funds/themes', permanent: true },
      { source: '/investors/themes/:slug*', destination: '/funds/themes/:slug*', permanent: true },
      { source: '/investors/sectors', destination: '/funds/sectors', permanent: true },
      { source: '/investors/sectors/:slug*', destination: '/funds/sectors/:slug*', permanent: true }
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/funds/stages/:slug((?!index\\.html$).*)',
          destination: '/api/investors/detail?slug=:slug&view=stage'
        },
        {
          source: '/funds/themes/:slug((?!index\\.html$).*)',
          destination: '/api/investors/detail?slug=:slug&view=theme'
        },
        {
          source: '/funds/sectors/:slug((?!index\\.html$).*)',
          destination: '/api/investors/detail?slug=:slug&view=sector'
        },
        {
          source: '/news/:slug((?!index\\.html$).*)',
          destination: '/api/news/article?slug=:slug'
        },
        {
          source: '/blog/:slug((?!index\\.html$).*)',
          destination: '/api/news/article?slug=:slug'
        },
        {
          source: '/buzz/:slug((?!index\\.html$).*)',
          destination: '/api/news/article?slug=:slug&feed=buzz'
        },
        { source: '/sitemap.xml', destination: '/api/ops?action=sitemap' }
      ]
    };
  }
};

module.exports = nextConfig;

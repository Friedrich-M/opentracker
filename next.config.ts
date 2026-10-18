import 'dotenv/config';
import createNextIntlPlugin from 'next-intl/plugin';
import pkg from './package.json' with { type: 'json' };
import { getContentSecurityPolicy } from './src/lib/csp';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const TRACKER_SCRIPT = '/script.js';
const RECORDER_SCRIPT = '/recorder.js';

const isProd = process.env.NODE_ENV === 'production';

const corsMaxAge = process.env.CORS_MAX_AGE || '';
const defaultLocale = process.env.DEFAULT_LOCALE || '';

const defaultHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Content-Security-Policy',
    value: getContentSecurityPolicy(),
  },
];

const trackerHeaders = [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*',
  },
  {
    key: 'Cache-Control',
    value: 'public, max-age=86400, must-revalidate',
  },
];

const apiHeaders = [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*',
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: '*',
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET, DELETE, POST, PUT',
  },
  {
    key: 'Access-Control-Max-Age',
    value: corsMaxAge || '86400',
  },
  {
    key: 'Cache-Control',
    value: 'no-cache',
  },
];

const headers = [
  {
    source: '/api/:path*',
    headers: apiHeaders,
  },
  {
    source: '/:path*',
    headers: defaultHeaders,
  },
];

if (isProd) {
  headers.push({
    source: TRACKER_SCRIPT,
    headers: trackerHeaders,
  });
  headers.push({
    source: RECORDER_SCRIPT,
    headers: trackerHeaders,
  });
}

const redirects = [
  {
    source: '/settings',
    destination: '/settings/preferences',
    permanent: false,
  },
  {
    source: '/admin',
    destination: '/admin/users',
    permanent: false,
  },
];

/** @type {import('next').NextConfig} */
export default withNextIntl({
  reactStrictMode: false,
  devIndicators: {
    position: 'bottom-right',
  },
  env: {
    currentVersion: pkg.version,
    defaultLocale,
  },
  // detect.ts opens the GeoLite databases by a runtime path, which Vercel's
  // function file tracing cannot see; ship them with every route that reads them.
  outputFileTracingIncludes: {
    '/api/send': ['./geo/*.mmdb'],
    '/api/record': ['./geo/*.mmdb'],
    '/api/websites/[websiteId]/sessions/[sessionId]/network': ['./geo/*.mmdb'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    useTypeScriptCli: true,
  },
  async headers() {
    return headers;
  },
  async redirects() {
    return [...redirects];
  },
});

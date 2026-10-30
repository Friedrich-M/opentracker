import { expect, test } from 'vitest';
import { getProjectHref, orderProjects, projectName } from '../ProjectTabs';
import {
  collapseRepeats,
  isSearchReferrer,
  pageLabel,
  pageUrl,
  referrerLabel,
  referrerUrl,
  sessionSeconds,
  sessionsToCsv,
  shortOrg,
} from './VisitorActivity';
import { groupVisits, type PathEvent, toCsv } from './VisitorPaths';

test('page and referrer URLs gain a scheme', () => {
  expect(pageUrl('example.com', '/docs/')).toBe('https://example.com/docs/');
  expect(pageUrl(null, '/docs/')).toBe('/docs/');
  expect(pageUrl('example.com', null)).toBeNull();
  expect(referrerUrl('www.youtube.com/')).toBe('https://www.youtube.com/');
  expect(referrerUrl('https://scholar.google.com/')).toBe('https://scholar.google.com/');
});

test('session length and repeated pages', () => {
  expect(sessionSeconds({ firstAt: '2026-10-11T17:00:00Z', lastAt: '2026-10-11T17:01:44Z' })).toBe(
    104,
  );
  expect(sessionSeconds({ firstAt: '2026-10-11T17:00:00Z', lastAt: '2026-10-11T17:00:00Z' })).toBe(
    0,
  );
  expect(collapseRepeats(['/', '/', '/docs/', '/', '/'])).toEqual(['/', '/docs/', '/']);
});

const event = (visitId: string, minute: number, extra: Partial<PathEvent> = {}): PathEvent => ({
  sessionId: `s-${visitId}`,
  visitId,
  websiteId: 'w',
  websiteName: 'Home',
  createdAt: `2026-10-11T17:${String(minute).padStart(2, '0')}:00Z`,
  hostname: 'example.com',
  urlPath: '/',
  urlQuery: null,
  referrerDomain: null,
  referrerPath: null,
  eventType: 1,
  eventName: null,
  internal: false,
  ...extra,
});

test('events group into visits, newest visit first, with the first referrer', () => {
  const visits = groupVisits([
    event('a', 1, { referrerDomain: 'scholar.google.com', referrerPath: '/' }),
    event('a', 2, { urlPath: '/publications.html', referrerDomain: 'example.com' }),
    event('b', 30, { tag: 'research', urlPath: '/docs/' }),
  ]);

  expect(visits.map(v => v.visitId)).toEqual(['b', 'a']);
  expect(visits[1].referrer).toBe('scholar.google.com/');
  expect(visits[1].events).toHaveLength(2);
  expect(visits[0].tag).toBe('research');
});

test('CSV export quotes cells that need it', () => {
  const csv = toCsv([event('a', 1, { websiteName: 'Home, "main"', urlQuery: 'model=11380' })]);
  const [header, row] = csv.split('\n');

  expect(header).toBe('time,website,project,visit,type,event,url,referrer,internal');
  expect(row).toContain('"Home, ""main"""');
  expect(row).toContain('https://example.com/?model=11380');
});

test('projects follow the configured order and switch by the tag filter', () => {
  const tags = ['hobbies', 'zeta', 'home', '', 'research', 'home'];

  // Without NEXT_PUBLIC_PROJECT_ORDER: alphabetical, de-duplicated, no empties.
  expect(orderProjects(tags, [])).toEqual(['hobbies', 'home', 'research', 'zeta']);
  // With one: those first, in that order; the rest alphabetical.
  expect(orderProjects(tags, ['home', 'research', 'hobbies'])).toEqual([
    'home',
    'research',
    'hobbies',
    'zeta',
  ]);
  expect(projectName('research')).toBe('Research');

  const query = { date: '24h', includeInternal: 'true', tag: 'home', session: 'abc', page: '3' };
  expect(getProjectHref('/websites/w/sessions', query, 'research')).toBe(
    '/websites/w/sessions?date=24h&includeInternal=true&tag=research',
  );
  expect(getProjectHref('/websites/w/sessions', query, null)).toBe(
    '/websites/w/sessions?date=24h&includeInternal=true',
  );
});

test('search engine referrers are recognised', () => {
  expect(isSearchReferrer('scholar.google.com/')).toBe(true);
  expect(isSearchReferrer('https://www.google.com/search')).toBe(true);
  expect(isSearchReferrer('bing.com/search')).toBe(true);
  expect(isSearchReferrer('www.youtube.com/')).toBe(false);
  expect(isSearchReferrer('nooraovo.github.io/')).toBe(false);
  expect(isSearchReferrer(null)).toBe(false);
});

test('sessions export one CSV row each', () => {
  const csv = sessionsToCsv([
    {
      id: 's',
      websiteId: 'w',
      hostname: 'example.com',
      browser: 'chrome',
      os: 'Mac OS',
      device: 'laptop',
      screen: '1440x900',
      language: 'en-US',
      country: 'US',
      region: 'US-NJ',
      city: 'Springfield',
      org: 'Example University, NJ',
      ip: '192.0.2.10',
      firstAt: '2026-10-11T17:00:00Z',
      lastAt: '2026-10-11T17:01:44Z',
      visits: 1,
      views: 3,
      events: 0,
      createdAt: '2026-10-11T17:01:44Z',
      pages: ['/', '/', '/docs/'],
      referrer: 'scholar.google.com/',
      internal: true,
      label: null,
    },
  ]);
  const [header, row] = csv.split('\n');

  expect(header.split(',')).toHaveLength(21);
  expect(row).toContain('"Example University, NJ"');
  expect(row).toContain('https://example.com/docs/');
  expect(row).toContain('/ > /docs/');
  expect(row).toContain(',104,');
  expect(row).toContain(',yes,');
});

test('referrers and entry pages read as names', () => {
  expect(referrerLabel('https://www.youtube.com/')).toBe('youtube.com');
  expect(referrerLabel('github.com/example-org/project')).toBe('github.com/example-org/project');
  expect(pageLabel('/', 'Jane Doe | Example University', 'Home page')).toBe('Home page');
  expect(pageLabel('/papers/', 'Project — A Longer Description of the Work', 'Home page')).toBe(
    'Project',
  );
  expect(pageLabel('/gallery/', 'Gallery', 'Home page')).toBe('Gallery');
  expect(pageLabel('/x/', null, 'Home page')).toBe('/x/');
  expect(pageLabel('/', 'Jane Doe', 'Home page', 'www.example.com', 'example.com')).toBe(
    'Home page',
  );
  expect(
    pageLabel('/', 'Gallery — Photos', 'Home page', 'gallery.example.com', 'example.com'),
  ).toBe('Gallery');
  expect(pageLabel('/', null, 'Home page', 'gallery.example.com', 'example.com')).toBe(
    'gallery.example.com',
  );
});

test('organisation names drop legal suffixes in the summary', () => {
  expect(shortOrg('Comcast Cable Communications, LLC')).toBe('Comcast Cable Communications');
  expect(shortOrg('Cablevision Systems Corp.')).toBe('Cablevision Systems');
  expect(shortOrg('Slovak Telekom, a.s.')).toBe('Slovak Telekom');
  expect(shortOrg('Hetzner Online GmbH')).toBe('Hetzner Online');
  expect(shortOrg('Example University')).toBe('Example University');
  expect(shortOrg('T-Mobile USA, Inc.')).toBe('T-Mobile USA');
});

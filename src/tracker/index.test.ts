import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  delete (window as Window & { tracker?: unknown }).tracker;
  delete (document as Document & { currentScript?: HTMLScriptElement }).currentScript;
  delete (document as Document & { readyState?: DocumentReadyState }).readyState;
  vi.unstubAllGlobals();
  vi.resetModules();
});

test('identifies data-distinct-id before the initial page view', async () => {
  const script = document.createElement('script');
  script.src = 'https://analytics.example.com/script.js';
  script.dataset.websiteId = 'website-id';
  script.dataset.distinctId = 'visitor-id';

  Object.defineProperties(document, {
    currentScript: { configurable: true, value: script },
    readyState: { configurable: true, value: 'complete' },
  });

  const fetchMock = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({}) });
  vi.stubGlobal('fetch', fetchMock);

  await import('./index');

  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  const requests = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));

  expect(requests[0]).toMatchObject({
    type: 'identify',
    payload: { id: 'visitor-id', website: 'website-id' },
  });
  expect(requests[1]).toMatchObject({
    type: 'event',
    payload: { id: 'visitor-id', website: 'website-id' },
  });
});

test('copies the dashboard owner cookie into the owner mark it sends', async () => {
  const script = document.createElement('script');
  script.src = 'https://analytics.example.com/script.js';
  script.dataset.websiteId = 'website-id';

  Object.defineProperties(document, {
    currentScript: { configurable: true, value: script },
    readyState: { configurable: true, value: 'complete' },
  });
  // biome-ignore lint/suspicious/noDocumentCookie: the test sets the cookie the script reads
  document.cookie = 'tracker_me=owner%20mark; Path=/';

  const fetchMock = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({}) });
  vi.stubGlobal('fetch', fetchMock);

  await import('./index');

  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const [, init] = fetchMock.mock.calls[0];

  expect(JSON.parse(init.body).payload.owner).toBe('owner mark');
  expect(localStorage.getItem('tracker.me')).toBe('owner mark');

  // biome-ignore lint/suspicious/noDocumentCookie: clears the cookie set above
  document.cookie = 'tracker_me=; Max-Age=0; Path=/';
  localStorage.removeItem('tracker.me');
});

test('sends outbound and download events for plain links', async () => {
  const script = document.createElement('script');
  script.src = 'https://analytics.example.com/script.js';
  script.dataset.websiteId = 'website-id';

  Object.defineProperties(document, {
    currentScript: { configurable: true, value: script },
    readyState: { configurable: true, value: 'complete' },
  });

  const fetchMock = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({}) });
  vi.stubGlobal('fetch', fetchMock);

  await import('./index');
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

  // jsdom cannot navigate; stop the default action after the tracker's capture listener.
  const stop = (e: Event) => e.preventDefault();
  document.addEventListener('click', stop);

  const links = {
    outbound: 'https://github.com/example/project',
    download: '/assets/paper.pdf',
    internal: '/publications.html',
  };
  for (const [id, href] of Object.entries(links)) {
    const a = document.createElement('a');
    a.id = id;
    a.href = href;
    a.innerHTML = '<span>link</span>';
    document.body.appendChild(a);
  }

  (document.querySelector('#outbound span') as HTMLElement).click();
  (document.querySelector('#download') as HTMLElement).click();
  (document.querySelector('#internal') as HTMLElement).click();

  // Earlier tests' scripts are still listening on this document, so match by
  // content rather than by call count.
  await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(2));
  const events = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).payload);
  const named = (name: string) => events.filter(event => event.name === name);

  expect(named('outbound')[0]).toMatchObject({
    data: { url: 'https://github.com/example/project', domain: 'github.com' },
  });
  expect(named('download')[0]).toMatchObject({ data: { file: 'paper.pdf' } });
  expect(
    events.filter(event => event.name && !['outbound', 'download'].includes(event.name)),
  ).toEqual([]);

  document.removeEventListener('click', stop);
  document.body.innerHTML = '';
});

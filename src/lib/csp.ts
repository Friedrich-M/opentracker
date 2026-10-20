// Builds the Content-Security-Policy (next.config.ts, at build time).
//
// Fonts, stylesheets and media may come from any HTTPS origin because the
// replay player draws a recorded page in a same-origin iframe, which inherits
// this policy: the page's web fonts, icon fonts and CDN stylesheets would
// otherwise be blocked and every replay would fall back to system fonts.
// The policy has to cover the whole dashboard, not only the replay route:
// client-side navigation keeps the document, and with it the policy, of the
// first page loaded. Scripts stay limited to this origin.
export function getContentSecurityPolicy() {
  const directives = [
    `default-src 'self'`,
    `img-src 'self' https: data: blob:`,
    `font-src 'self' https: data:`,
    `media-src 'self' https: blob:`,
    `script-src 'self' 'unsafe-eval' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline' https:`,
    `connect-src 'self' https:`,
    `frame-src 'self' http: https:`,
    `frame-ancestors 'self'`,
  ];

  return `${directives.join('; ')};`;
}

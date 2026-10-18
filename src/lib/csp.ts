// Builds the Content-Security-Policy (next.config.ts, at build time).
export function getContentSecurityPolicy() {
  const directives = [
    `default-src 'self'`,
    `img-src 'self' https: data: blob:`,
    `script-src 'self' 'unsafe-eval' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `connect-src 'self' https:`,
    `frame-src 'self' http: https:`,
    `frame-ancestors 'self'`,
  ];

  return `${directives.join('; ')};`;
}

// The request context the OpenNext Cloudflare worker keeps for each request
// (its bindings, ExecutionContext and `request.cf`). It is read from the
// global symbol the worker defines rather than through @opennextjs/cloudflare,
// so other hosts carry no adapter code; there it is undefined.

interface CloudflareRequestCf {
  country?: string;
  regionCode?: string;
  city?: string;
  asn?: number;
  asOrganization?: string;
}

interface CloudflareRequestContext {
  env: Record<string, unknown>;
  ctx: object;
  cf?: CloudflareRequestCf;
}

const CONTEXT = Symbol.for('__cloudflare-context__');

export function getCloudflareContext(): CloudflareRequestContext | undefined {
  return (globalThis as Record<symbol, CloudflareRequestContext | undefined>)[CONTEXT];
}

// A Hyperdrive binding named HYPERDRIVE, when the worker has one: a pooled
// connection string that replaces DATABASE_URL.
export function getHyperdriveUrl(): string | undefined {
  const binding = getCloudflareContext()?.env?.HYPERDRIVE as
    | { connectionString?: string }
    | undefined;

  return binding?.connectionString || undefined;
}

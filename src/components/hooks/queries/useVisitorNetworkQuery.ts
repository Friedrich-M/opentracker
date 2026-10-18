import { useApi } from '../useApi';

interface VisitorNetwork {
  coordinates: { latitude: number; longitude: number; accuracyRadius: number | null } | null;
  hostname: string | null;
}

/** Map position and host name of a session's IP; owner-only, so `enabled` gates it. */
export function useVisitorNetworkQuery(websiteId: string, sessionId: string, enabled: boolean) {
  const { get, useQuery } = useApi();

  return useQuery<VisitorNetwork>({
    queryKey: ['session:network', { websiteId, sessionId }],
    queryFn: () => get(`/websites/${websiteId}/sessions/${sessionId}/network`),
    enabled: Boolean(enabled && websiteId && sessionId),
    staleTime: Infinity,
  });
}

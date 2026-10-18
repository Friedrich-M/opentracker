import { useApi } from '../useApi';

export function useVisitorPathsQuery(websiteId: string, sessionId: string | undefined) {
  const { get, useQuery } = useApi();

  return useQuery({
    queryKey: ['session:paths', { websiteId, sessionId }],
    queryFn: () => {
      return get(`/websites/${websiteId}/sessions/${sessionId}/paths`);
    },
    enabled: Boolean(websiteId && sessionId),
  });
}

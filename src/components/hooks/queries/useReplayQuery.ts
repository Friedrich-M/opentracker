import { useApi } from '../useApi';

interface ReplayQueryOptions {
  until?: number;
  chunkIndex?: number;
  eventIndex?: number;
  tag?: string;
}

export function useReplayQuery(
  websiteId: string,
  replayId: string,
  options: ReplayQueryOptions = {},
) {
  const { get, useQuery } = useApi();
  const { until, chunkIndex, eventIndex, tag } = options;

  return useQuery({
    queryKey: ['replay', { websiteId, replayId, until, chunkIndex, eventIndex, tag }],
    queryFn: () => {
      return get(`/websites/${websiteId}/replays/${replayId}`, {
        until,
        chunkIndex,
        eventIndex,
        tag,
      });
    },
    enabled: Boolean(websiteId && replayId),
  });
}

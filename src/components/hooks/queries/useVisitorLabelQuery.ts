import { useApi } from '../useApi';
import { useModified } from '../useModified';

export function useVisitorLabelQuery(ip: string | null | undefined) {
  const { get, useQuery } = useApi();
  const { modified } = useModified('visitor-labels');

  return useQuery({
    queryKey: ['visitor-label', { ip, modified }],
    queryFn: () => {
      return get('/me/visitor-labels', { ip });
    },
    enabled: Boolean(ip),
  });
}

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { buildPath } from '@/lib/url';

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, websiteId] = pathname.match(/\/websites\/([a-f0-9-]+)/) || [];
  const searchParamsString = searchParams.toString();
  const queryParams = useMemo(() => Object.fromEntries(searchParams), [searchParamsString]);

  const updateParams = useCallback(
    (params?: Record<string, string | number>) => {
      return buildPath(pathname, { ...queryParams, ...params });
    },
    [pathname, queryParams],
  );

  const replaceParams = useCallback(
    (params?: Record<string, string | number>) => {
      return buildPath(pathname, params);
    },
    [pathname],
  );

  const renderUrl = useCallback(
    (path: string, params?: Record<string, string | number> | false) => {
      return buildPath(path, params === false ? {} : { ...queryParams, ...params });
    },
    [queryParams],
  );

  return {
    router,
    pathname,
    searchParams,
    query: queryParams,
    websiteId,
    updateParams,
    replaceParams,
    renderUrl,
  };
}

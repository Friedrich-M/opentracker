import { z } from 'zod';
import { checkAuth } from '@/lib/auth';
import { DEFAULT_PAGE_SIZE, FILTER_COLUMNS, OPERATORS } from '@/lib/constants';
import { getAllowedUnits, getMinimumUnit, maxDate, parseDateRange } from '@/lib/date';
import { fetchWebsite } from '@/lib/load';
import { isNetworkColumn } from '@/lib/network';
import {
  filtersArrayToObject,
  parseSessionPropertyFilters,
  parseUniversalEventPropertyFilters,
} from '@/lib/params';
import { badRequest, unauthorized } from '@/lib/response';
import { allowShareFilter, excludeShareFilterParam } from '@/lib/share';
import type { QueryFilters } from '@/lib/types';
import { getWebsiteSegment } from '@/queries/prisma';

export async function parseRequest(
  request: Request,
  schema?: any,
  options?: { skipAuth?: boolean; requireUser?: boolean },
): Promise<any> {
  const url = new URL(request.url);
  let query = Object.fromEntries(url.searchParams);
  let body = await getJsonBody(request);
  let error: () => undefined | undefined | Response;
  let auth = null;

  if (schema) {
    const isGet = request.method === 'GET';
    const rawQuery = query;
    const result = schema.safeParse(isGet ? query : body);

    if (!result.success) {
      error = () => badRequest(z.treeifyError(result.error));
    } else if (isGet) {
      query = result.data;

      // Re-add dynamic params stripped by Zod schema: suffixed filter params (browser1, os2)
      for (const key of Object.keys(rawQuery)) {
        if (
          (/\d+$/.test(key) || /^pf_/.test(key) || /^epf\d+$/.test(key) || /^spf\d+$/.test(key)) &&
          !(key in query)
        ) {
          query[key] = rawQuery[key];
        }
      }
    } else {
      body = result.data;
    }
  }

  if (!options?.skipAuth && !error) {
    auth = await checkAuth(request);

    // Account routes act on the signed-in user; a share token carries none,
    // so they must refuse it here instead of failing on auth.user later.
    if (!auth || (options?.requireUser && !auth.user)) {
      error = () => unauthorized();
    }
  }

  // The owner's own visits are for logged-in users; a share link cannot
  // reveal them by adding includeInternal to its URL.
  if (query?.includeInternal !== undefined && !auth?.user) {
    delete query.includeInternal;
  }

  // Visitor network data is for signed-in users (AGENTS.md): a share link can
  // neither list it as a metric (?type=org) nor filter or search on it (org,
  // org1, …). A share whose owner turned filters off takes none at all,
  // whatever its URL says — the switch is enforced here, not only in the UI.
  if (auth && !auth.user && query) {
    if (isNetworkColumn(query.type) && !error) {
      error = () => unauthorized();
    }

    const filtersAllowed = allowShareFilter(auth.shareToken?.parameters);

    for (const key of Object.keys(query)) {
      if (isNetworkColumn(key) || (!filtersAllowed && isFilterParam(key))) {
        delete query[key];
      }
    }
  }

  return { url, query, body, auth, error };
}

// A query parameter that narrows the data: a column filter, a property
// filter, a saved segment or cohort, or a search. `eventType` is listed as a
// filter column but is the view's own Views/Events switch, so it stays.
function isFilterParam(key: string) {
  if (key === 'eventType') {
    return false;
  }

  return excludeShareFilterParam(key) || /^(pf_|epf\d+$|spf\d+$)/.test(key) || key === 'search';
}

async function getJsonBody(request: Request) {
  try {
    return await request.clone().json();
  } catch {
    return undefined;
  }
}

function getRequestDateRange(query: Record<string, string>) {
  const { startAt, endAt, unit, timezone } = query;

  const startDate = new Date(+startAt);
  const endDate = new Date(+endAt);

  return {
    startDate,
    endDate,
    timezone,
    unit: getAllowedUnits(startDate, endDate).includes(unit)
      ? unit
      : getMinimumUnit(startDate, endDate),
  };
}

function getRequestFilters(query: Record<string, any>) {
  const result: Record<string, any> = {};

  for (const key of Object.keys(query)) {
    const baseName = key.replace(/\d+$/, '');
    if (baseName in FILTER_COLUMNS) {
      result[key] = query[key];
    }
  }

  return result;
}

async function setWebsiteDate(websiteId: string, data: Record<string, any>) {
  const website = await fetchWebsite(websiteId);
  if (website?.resetAt) {
    data.startDate = maxDate(data.startDate, new Date(website?.resetAt));
  }

  return data;
}

export async function getQueryFilters(
  params: Record<string, any>,
  websiteId?: string,
): Promise<QueryFilters> {
  const dateRange = getRequestDateRange(params);
  const filters = getRequestFilters(params);
  const eventPropertyFilters = parseUniversalEventPropertyFilters(params);
  const sessionPropertyFilters = parseSessionPropertyFilters(params);

  let match = params?.match;

  if (params?.includeInternal === 'true' || params?.includeInternal === true) {
    Object.assign(filters, { includeInternal: true });
  }

  if (websiteId) {
    await setWebsiteDate(websiteId, dateRange);

    if (params.segment) {
      const segmentParams = (await getWebsiteSegment(websiteId, params.segment))
        ?.parameters as Record<string, any>;

      Object.assign(filters, filtersArrayToObject(segmentParams.filters));
      sessionPropertyFilters.push(...(segmentParams.sessionPropertyFilters ?? []));

      if (segmentParams.match) {
        match = segmentParams.match;
      }
    }

    if (params.cohort) {
      const cohortParams = (await getWebsiteSegment(websiteId, params.cohort))
        ?.parameters as Record<string, any>;

      const { startDate, endDate } = parseDateRange(cohortParams.dateRange);

      const cohortFilters = cohortParams.filters.map(({ name, ...props }) => ({
        ...props,
        name: `cohort_${name}`,
      }));

      cohortFilters.push({
        name: `cohort_${cohortParams.action.type}`,
        operator: OPERATORS.equals,
        value: cohortParams.action.value,
      });

      Object.assign(filters, {
        ...filtersArrayToObject(cohortFilters),
        cohort_startDate: startDate,
        cohort_endDate: endDate,
        ...(cohortParams.match && {
          cohort_match: cohortParams.match,
          cohort_actionName: `cohort_${cohortParams.action.type}`,
        }),
      });
    }

    if (params.excludeBounce) {
      Object.assign(filters, { excludeBounce: true });
    }
  }

  return {
    ...dateRange,
    ...filters,
    match,
    minDuration: params?.minDuration,
    eventPropertyFilters,
    sessionPropertyFilters,
    page: params?.page,
    pageSize: params?.pageSize ? params?.pageSize || DEFAULT_PAGE_SIZE : undefined,
    orderBy: params?.orderBy,
    sortDescending: params?.sortDescending,
    search: params?.search,
    compare: params?.compare,
    maxResults: params?.maxResults,
  };
}

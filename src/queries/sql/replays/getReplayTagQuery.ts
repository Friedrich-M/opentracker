import { OPERATORS } from '@/lib/constants';
import { filtersObjectToArray } from '@/lib/params';
import type { QueryFilters } from '@/lib/types';

/**
 * A project view (`tag` filter) keeps only the chunks recorded on its own
 * pages: a visit that crosses projects shows in each, with that project's
 * pages only. Text operators fall back to the visit-level event filter.
 */
export function getReplayTagQuery(tag: unknown, column: string) {
  if (typeof tag !== 'string' || !tag) {
    return { tagQuery: '', replayTags: undefined };
  }

  const [{ operator, value }] = filtersObjectToArray({ tag } as QueryFilters);

  switch (operator) {
    case OPERATORS.equals:
      return { tagQuery: `and ${column} = ANY({{replayTags}})`, replayTags: value as string[] };
    case OPERATORS.notEquals:
      return {
        tagQuery: `and (${column} is null or ${column} != ALL({{replayTags}}))`,
        replayTags: value as string[],
      };
    default:
      return { tagQuery: '', replayTags: undefined };
  }
}

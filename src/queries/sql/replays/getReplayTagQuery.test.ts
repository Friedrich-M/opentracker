import { describe, expect, test } from 'vitest';
import { getReplayTagQuery } from './getReplayTagQuery';

describe('getReplayTagQuery', () => {
  test('is empty without a tag', () => {
    expect(getReplayTagQuery(undefined, 'sr.tag')).toEqual({ tagQuery: '', replayTags: undefined });
    expect(getReplayTagQuery('', 'sr.tag')).toEqual({ tagQuery: '', replayTags: undefined });
  });

  test('keeps chunks of the project, plain or eq.', () => {
    const expected = { tagQuery: 'and sr.tag = ANY({{replayTags}})', replayTags: ['hobbies'] };

    expect(getReplayTagQuery('hobbies', 'sr.tag')).toEqual(expected);
    expect(getReplayTagQuery('eq.hobbies', 'sr.tag')).toEqual(expected);
  });

  test('neq keeps untagged chunks', () => {
    expect(getReplayTagQuery('neq.home,research', 'tag')).toEqual({
      tagQuery: 'and (tag is null or tag != ALL({{replayTags}}))',
      replayTags: ['home', 'research'],
    });
  });

  test('text operators leave chunks unfiltered', () => {
    expect(getReplayTagQuery('c.hob', 'tag')).toEqual({ tagQuery: '', replayTags: undefined });
  });
});

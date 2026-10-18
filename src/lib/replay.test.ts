import { expect, test } from 'vitest';
import {
  getReplayEventCount,
  getReplayPlayerEvents,
  getReplayViewport,
  hasReplayableFullSnapshot,
  isReplayEventFragment,
  REPLAY_EVENT_FRAGMENT_TYPE,
  restoreReplayEventFragments,
} from './replay';

const fullSnapshot = {
  type: 2,
  timestamp: 1781553116151,
  data: {
    node: {
      type: 0,
      id: 1,
      childNodes: [{ type: 2, id: 2, tagName: 'html', attributes: {}, childNodes: [] }],
    },
    initialOffset: { left: 0, top: 0 },
  },
};

test('getReplayViewport returns the recorded viewport dimensions', () => {
  expect(getReplayViewport(null)).toBe(null);
  expect(getReplayViewport([{ type: 4, data: { width: 0, height: 768 } }])).toBe(null);
  expect(getReplayViewport([{ type: 4, data: { width: '1024', height: '1365' } }])).toEqual({
    width: 1024,
    height: 1365,
  });
});

test('hasReplayableFullSnapshot returns true when a usable full snapshot is present', () => {
  expect(hasReplayableFullSnapshot([{ type: 4 }, fullSnapshot, { type: 3 }])).toBe(true);
});

test('getReplayPlayerEvents normalizes events for rrweb-player', () => {
  expect(getReplayPlayerEvents(null)).toEqual([]);
  expect(getReplayPlayerEvents([{ type: 3, timestamp: 1781553116160 }])).toEqual([]);

  expect(getReplayPlayerEvents([fullSnapshot])).toEqual([
    fullSnapshot,
    { ...fullSnapshot, timestamp: fullSnapshot.timestamp + 1 },
  ]);

  expect(
    getReplayPlayerEvents([
      { type: 0, timestamp: '1781553116149' },
      { ...fullSnapshot, timestamp: undefined },
    ]),
  ).toEqual([
    { type: 0, timestamp: 1781553116149 },
    { ...fullSnapshot, timestamp: 1781553116150 },
  ]);
});

test('restoreReplayEventFragments restores fragmented events', () => {
  const serialized = JSON.stringify(fullSnapshot);
  const splitAt = Math.floor(serialized.length / 2);

  const events = restoreReplayEventFragments([
    { type: 4, timestamp: 1781553116150 },
    {
      type: REPLAY_EVENT_FRAGMENT_TYPE,
      timestamp: fullSnapshot.timestamp,
      data: {
        id: 'snapshot-1',
        index: 0,
        total: 2,
        value: serialized.slice(0, splitAt),
      },
    },
    {
      type: REPLAY_EVENT_FRAGMENT_TYPE,
      timestamp: fullSnapshot.timestamp,
      data: {
        id: 'snapshot-1',
        index: 1,
        total: 2,
        value: serialized.slice(splitAt),
      },
    },
    { type: 3, timestamp: 1781553116160 },
  ]);

  expect(events).toEqual([
    { type: 4, timestamp: 1781553116150 },
    fullSnapshot,
    { type: 3, timestamp: 1781553116160 },
  ]);
});

test('getReplayEventCount counts a fragment group as one event', () => {
  expect(
    getReplayEventCount([
      { type: 4 },
      {
        type: REPLAY_EVENT_FRAGMENT_TYPE,
        data: { id: 'snapshot-1', index: 0, total: 2, value: '{' },
      },
      {
        type: REPLAY_EVENT_FRAGMENT_TYPE,
        data: { id: 'snapshot-1', index: 1, total: 2, value: '}' },
      },
      { type: 3 },
    ]),
  ).toBe(3);
});

test('fragments recorded under the old type name are still recognised', () => {
  const data = { id: 'a', index: 0, total: 2, value: '{}' };

  expect(isReplayEventFragment({ type: REPLAY_EVENT_FRAGMENT_TYPE, data })).toBe(true);
  expect(isReplayEventFragment({ type: 'umami:rrweb-event-fragment', data })).toBe(true);
  expect(isReplayEventFragment({ type: 'other', data })).toBe(false);
});

import { expect, test } from 'vitest';
import { withoutHiddenReports } from './useWebsiteNavItems';

const groups = [
  { label: 'Traffic', items: [{ id: 'overview' }, { id: 'compare' }] },
  { label: 'Growth', items: [{ id: 'utm' }, { id: 'attribution' }] },
];

test('hidden reports leave the menu, and so does a group left empty', () => {
  expect(withoutHiddenReports(groups, ['compare', 'utm', 'attribution'])).toEqual([
    { label: 'Traffic', items: [{ id: 'overview' }] },
  ]);
});

test('nothing hidden keeps every report', () => {
  expect(withoutHiddenReports(groups, [])).toEqual(groups);
});

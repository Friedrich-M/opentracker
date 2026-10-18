import { expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import { SessionProfile } from './SessionProfile';

const mockUseWebsiteSessionQuery = vi.fn();

vi.mock('@/components/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/components/hooks')>('@/components/hooks');

  return {
    ...actual,
    useMessages: () => ({
      t: (value: string) => value,
      labels: {
        activity: 'Activity',
        properties: 'Properties',
        replays: 'Replays',
        navigationPaths: 'Navigation paths',
        unknown: 'Unknown',
      },
    }),
    useMobile: () => ({ isMobile: false }),
    useWebsiteSessionQuery: () => mockUseWebsiteSessionQuery(),
    useVisitorLabelQuery: () => ({ data: null }),
    useVisitorNetworkQuery: () => ({ data: null }),
    useVisitorPathsQuery: () => ({ data: [] }),
  };
});

vi.mock('@/components/common/SessionMark', () => ({
  SessionMark: () => <div>SessionMark</div>,
}));

vi.mock('@/components/common/LoadingPanel', () => ({
  LoadingPanel: ({ children, data }: { children: React.ReactNode; data: unknown }) =>
    data ? <div>{children}</div> : null,
}));

vi.mock('./SessionDeleteButton', () => ({
  SessionDeleteButton: () => <div data-test="session-delete-button" />,
}));

vi.mock('./SessionData', () => ({
  SessionData: () => <div>SessionData</div>,
}));

vi.mock('./SessionReplaysDataTable', () => ({
  SessionReplaysDataTable: () => <div>SessionReplaysDataTable</div>,
}));

vi.mock('./VisitorPaths', () => ({
  initialReferrer: () => null,
  VisitorPaths: () => <div>VisitorPaths</div>,
}));

vi.mock('./VisitorFacts', () => ({
  VisitorFacts: () => <div>VisitorFacts</div>,
}));

vi.mock('./VisitorLabel', () => ({
  VisitorLabel: () => <div>VisitorLabel</div>,
}));

function createSessionQueryResult(canDelete: boolean) {
  return {
    data: {
      id: 'session-1',
      canDelete,
      firstAt: new Date('2026-07-24T00:00:00.000Z'),
      lastAt: new Date('2026-07-24T00:05:00.000Z'),
      distinctId: 'distinct-1',
    },
    isLoading: false,
    error: undefined,
  };
}

test('hides the delete button on share routes', () => {
  mockUseWebsiteSessionQuery.mockReturnValue(createSessionQueryResult(true));

  render(<SessionProfile websiteId="website-1" sessionId="session-1" onClose={() => null} />, {
    route: '/share/slug/sessions?session=session-1',
  });

  expect(screen.queryByTestId('session-delete-button')).not.toBeInTheDocument();
});

test('shows the delete button on regular website routes when deletion is allowed', () => {
  mockUseWebsiteSessionQuery.mockReturnValue(createSessionQueryResult(true));

  render(<SessionProfile websiteId="website-1" sessionId="session-1" onClose={() => null} />, {
    route: '/websites/website-1/sessions?session=session-1',
  });

  expect(screen.getByTestId('session-delete-button')).toBeInTheDocument();
});

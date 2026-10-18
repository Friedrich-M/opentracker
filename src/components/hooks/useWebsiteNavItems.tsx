import { useMessages } from './useMessages';
import { useNavigation } from './useNavigation';

export function useWebsiteNavItems(websiteId: string) {
  const { t, labels } = useMessages();
  const { pathname, renderUrl } = useNavigation();
  const resetParams = {
    search: undefined,
    page: undefined,
  };

  const renderPath = (path: string) =>
    renderUrl(`/websites/${websiteId}${path}`, {
      ...resetParams,
      event: undefined,
      compare: undefined,
      view: undefined,
      unit: undefined,
      excludeBounce: undefined,
    });

  const items = [
    {
      label: t(labels.traffic),
      items: [
        {
          id: 'overview',
          label: t(labels.overview),
          path: renderPath(''),
        },
        {
          id: 'events',
          label: t(labels.events),
          path: renderPath('/events'),
        },
        {
          id: 'sessions',
          label: t(labels.sessions),
          path: renderPath('/sessions'),
        },
        {
          id: 'realtime',
          label: t(labels.realtime),
          path: renderPath('/realtime'),
        },
        {
          id: 'performance',
          label: t(labels.performance),
          path: renderPath('/performance'),
        },
        {
          id: 'compare',
          label: t(labels.compare),
          path: renderPath('/compare'),
        },
        {
          id: 'breakdown',
          label: t(labels.breakdown),
          path: renderPath('/breakdown'),
        },
      ],
    },
    {
      label: t(labels.behavior),
      items: [
        {
          id: 'goals',
          label: t(labels.goals),
          path: renderPath('/goals'),
        },
        {
          id: 'funnel',
          label: t(labels.funnels),
          path: renderPath('/funnels'),
        },
        {
          id: 'journeys',
          label: t(labels.journeys),
          path: renderPath('/journeys'),
        },
        {
          id: 'retention',
          label: t(labels.retention),
          path: renderPath('/retention'),
        },
        {
          id: 'replays',
          label: t(labels.replays),
          path: renderPath('/replays'),
        },
        {
          id: 'heatmaps',
          label: t(labels.heatmaps),
          path: renderPath('/heatmaps'),
        },
      ],
    },
    {
      label: t(labels.audience),
      items: [
        {
          id: 'segments',
          label: t(labels.segments),
          path: renderPath('/segments'),
        },
        {
          id: 'cohorts',
          label: t(labels.cohorts),
          path: renderPath('/cohorts'),
        },
      ],
    },
    {
      label: t(labels.growth),
      items: [
        {
          id: 'utm',
          label: t(labels.utm),
          path: renderPath('/utm'),
        },
        {
          id: 'attribution',
          label: t(labels.attribution),
          path: renderPath('/attribution'),
        },
      ],
    },
  ];

  const selectedKey = items
    .flatMap(e => e.items)
    .find(({ path }) => path && pathname.endsWith(path.split('?')[0]))?.id;

  return { items, selectedKey, renderPath };
}

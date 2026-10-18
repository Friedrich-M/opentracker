import { useState } from 'react';
import Link from '@/components/common/Link';
import { useMessages, useNavigation, useWebsite, useWebsiteValuesQuery } from '@/components/hooks';
import { buildPath } from '@/lib/url';
import styles from './ProjectTabs.module.css';

/**
 * Projects are event tags: each page of the site loads the tracker with
 * `data-tag` (home, research, hobbies), and a project view is the `tag` filter.
 * Known projects keep the site's order; any other tag follows alphabetically.
 */
const PROJECT_ORDER = ['home', 'research', 'hobbies'];

// Parameters that name something inside one view (a session, a page of
// results) and mean nothing after the filter changes.
const VIEW_SCOPED_PARAMS = ['session', 'page', 'full'];

export function orderProjects(tags: string[]) {
  const rank = (tag: string) => {
    const i = PROJECT_ORDER.indexOf(tag);
    return i === -1 ? PROJECT_ORDER.length : i;
  };

  return [...new Set(tags.filter(Boolean))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

// Display names for the site's projects; any other tag shows capitalised.
const PROJECT_LABELS: Record<string, string> = {
  home: 'projectHome',
  research: 'projectResearch',
  hobbies: 'projectHobbies',
};

export function projectName(
  tag: string,
  t?: (key: string) => string,
  labels?: Record<string, string>,
) {
  const key = PROJECT_LABELS[tag];
  if (key && t && labels?.[key]) return t(labels[key]);
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

/** The current page with `tag` set to a project, or removed for All. */
export function getProjectHref(
  pathname: string,
  query: Record<string, string>,
  tag: string | null,
) {
  const params = Object.fromEntries(
    Object.entries(query).filter(([key]) => key !== 'tag' && !VIEW_SCOPED_PARAMS.includes(key)),
  );

  return buildPath(pathname, tag ? { ...params, tag } : params);
}

/** All · Home · Research · Hobbies under the website title. All is the default. */
export function ProjectTabs() {
  const website = useWebsite();
  const { t, labels } = useMessages();
  const { pathname, query } = useNavigation();
  // Every tag the website has ever seen (events can predate the website row
  // after an import); fixed per mount so the query key is stable.
  const [{ startDate, endDate }] = useState(() => ({
    startDate: new Date(0),
    endDate: new Date(),
  }));
  const { data } = useWebsiteValuesQuery({
    websiteId: website.id,
    type: 'tag',
    startDate,
    endDate,
  });
  const projects = orderProjects((data ?? []).map((row: { value: string }) => row.value));
  const current = query.tag ?? null;

  if (!projects.length) {
    return null;
  }

  const tab = (tag: string | null, name: string) => (
    <li key={tag ?? ''}>
      <Link
        className={styles.tab}
        href={getProjectHref(pathname, query, tag)}
        aria-current={current === tag ? 'page' : undefined}
        scroll={false}
      >
        {name}
      </Link>
    </li>
  );

  return (
    <nav aria-label={t(labels.projects)}>
      <ul className={styles.tabs}>
        {tab(null, t(labels.all))}
        {projects.map(tag => tab(tag, projectName(tag, t, labels)))}
      </ul>
    </nav>
  );
}

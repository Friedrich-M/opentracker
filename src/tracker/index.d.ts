/** Public types for the browser tracker. */
export type TrackedProperties = {
  /**
   * Hostname of server
   *
   * @description extracted from `window.location.hostname`
   * @example 'stats.example.com'
   */
  hostname?: string;
  /** Distinct ID associated with the current visitor. */
  id?: string;
  /**
   * Browser language
   *
   * @description extracted from `window.navigator.language`
   * @example 'en-US', 'fr-FR'
   */
  language?: string;
  /**
   * Page referrer
   *
   * @description extracted from `document.referrer`
   * @example 'https://example.com/docs/getting-started'
   */
  referrer?: string;
  /**
   * Screen dimensions
   *
   * @description extracted from `window.screen.width` and `window.screen.height`
   * @example '1920x1080', '2560x1440'
   */
  screen?: string;
  /** Tag configured on the tracker script. */
  tag?: string;
  /**
   * The owner mark stored in this browser (set by visiting a tracked page with
   * `?tracker=<mark>`; `?tracker=reader` clears it). The server compares it
   * with its OWNER_MARK secret and stores matching visits as internal.
   */
  owner?: string;
  /**
   * Page title
   *
   * @description extracted from `document.querySelector('head > title')`
   * @example 'tracker'
   */
  title?: string;
  /**
   * Page url
   *
   * @description normalized from `window.location.href`
   * @example 'https://example.com/docs/getting-started'
   */
  url?: string;
  /**
   * Website ID (required)
   *
   * @example 'b59e9c65-ae32-47f1-8400-119fcf4861c4'
   */
  website: string;
};
export type WithRequired<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};
export type EventDataValue = boolean | number | string | null | EventData | EventDataValue[];
/**
 *
 * Event Data can work with any JSON data. There are a few rules in place to maintain performance.
 * - Numbers have a max precision of 4.
 * - Strings have a max length of 500.
 * - Arrays are converted to a String, with the same max length of 500.
 * - Objects have a max of 50 properties. Arrays are considered 1 property.
 */
export interface EventData {
  [key: string]: EventDataValue;
}
export type EventProperties = {
  /**
   * NOTE: event names will be truncated past 50 characters
   */
  name: string;
  data?: EventData;
} & WithRequired<TrackedProperties, 'website'>;
export type PageViewProperties = WithRequired<TrackedProperties, 'website'>;
export type CustomEventFunction = (
  props: PageViewProperties,
) => EventProperties | PageViewProperties;
export type Tracker = {
  track: {
    /**
     * Track a page view
     *
     * @example ```
     * tracker.track();
     * ```
     */
    (): Promise<void>;
    /**
     * Track an event with a given name
     *
     * NOTE: event names will be truncated past 50 characters
     *
     * @example ```
     * tracker.track('signup-button');
     * ```
     */
    (eventName: string): Promise<void>;
    /**
     * Tracks an event with dynamic data.
     *
     * NOTE: event names will be truncated past 50 characters
     *
     * When tracking events, the default properties are included in the payload. This is equivalent to running:
     *
     * ```js
     * tracker.track(props => ({
     *   ...props,
     *   name: 'signup-button',
     *   data: {
     *     name: 'newsletter',
     *     id: 123
     *   }
     * }));
     * ```
     *
     * @example ```
     * tracker.track('signup-button', { name: 'newsletter', id: 123 });
     * ```
     */
    (eventName: string, obj: EventData): Promise<void>;
    /**
     * Tracks a page view with custom properties
     *
     * @example ```
     * tracker.track({ website: 'e676c9b4-11e4-4ef1-a4d7-87001773e9f2', url: '/home', title: 'Home page' });
     * ```
     */
    (properties: PageViewProperties): Promise<void>;
    /**
     * Tracks an event with fully customizable dynamic data
     * If you don't specify any `name` and/or `data`, it will be treated as a page view
     *
     * @example ```
     * tracker.track((props) => ({ ...props, url: path }));
     * ```
     */
    (eventFunction: CustomEventFunction): Promise<void>;
  };
  identify: {
    /**
     * Identify a visitor with optional associated data.
     *
     * @example ```
     * tracker.identify('user-123', { plan: 'pro' });
     * ```
     */
    (id: string, data?: EventData): Promise<void>;
    /**
     * Associate data with the current visitor. An `id` string sets the Distinct ID.
     *
     * @example ```
     * tracker.identify({ id: 'user-123', plan: 'pro' });
     * ```
     */
    (
      data: EventData & {
        id?: string;
      },
    ): Promise<void>;
  };
  getSession: () => {
    cache: string | undefined;
    website: string | null;
  };
};
declare global {
  interface Window {
    tracker: Tracker;
  }
}

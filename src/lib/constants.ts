export const CURRENT_VERSION = process.env.currentVersion;
export const AUTH_TOKEN = 'tracker.auth';
export const LOCALE_CONFIG = 'tracker.locale';
export const TIMEZONE_CONFIG = 'tracker.timezone';
export const DATE_RANGE_CONFIG = 'tracker.date-range';
export const SHARE_TOKEN_HEADER = 'x-tracker-share-token';
export const SHARE_CONTEXT_HEADER = 'x-tracker-share-context';
// Token lifetimes (jsonwebtoken `expiresIn`). Logins also end when the
// password changes; share tokens are re-checked against the share each request.
export const LOGIN_TOKEN_TTL = '30d';
export const SHARE_TOKEN_TTL = '1d';
export const SHARE_TOKEN_TYPE = 'share';
export const CACHE_TOKEN_TYPE = 'cache';
export const PARTIAL_AUTH_TOKEN_TYPE = 'partial-auth';
// Missing request hosts must never send a self-hosted instance to another operator.
export const HOMEPAGE_URL = 'http://localhost:3000';
export const FAVICON_URL = 'https://icons.duckduckgo.com/ip3/{{domain}}.ico';

export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_ANIMATION_DURATION = 300;
export const DEFAULT_DATE_RANGE_VALUE = '24hour';
export const DEFAULT_RESET_DATE = '2000-01-01';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGING_RESULTS = 10000;

export const REALTIME_RANGE = 30;
export const REALTIME_INTERVAL = 10000;

export const UNIT_TYPES = ['year', 'month', 'hour', 'day', 'minute'];

export const EVENT_COLUMNS = [
  'path',
  'fullPath',
  'entry',
  'exit',
  'referrer',
  'domain',
  'title',
  'query',
  'event',
  'tag',
  'hostname',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmContent',
  'utmTerm',
];

export const SESSION_COLUMNS = [
  'browser',
  'os',
  'device',
  'screen',
  'language',
  'country',
  'city',
  'region',
  'org',
  'distinctId',
];

export const SEGMENT_TYPES = {
  segment: 'segment',
  cohort: 'cohort',
};

export const FILTER_COLUMNS = {
  path: 'url_path',
  entry: 'url_path',
  exit: 'url_path',
  referrer: 'referrer_domain',
  domain: 'referrer_domain',
  hostname: 'hostname',
  distinctId: 'distinct_id',
  title: 'page_title',
  query: 'url_query',
  os: 'os',
  browser: 'browser',
  device: 'device',
  country: 'country',
  region: 'region',
  city: 'city',
  org: 'org',
  language: 'language',
  event: 'event_name',
  tag: 'tag',
  eventType: 'event_type',
  utmSource: 'utm_source',
  utmMedium: 'utm_medium',
  utmCampaign: 'utm_campaign',
  utmContent: 'utm_content',
  utmTerm: 'utm_term',
};

export const COLLECTION_TYPE = {
  event: 'event',
  identify: 'identify',
  performance: 'performance',
  record: 'record',
} as const;

export const WEB_VITALS_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000, unit: 'ms' },
  inp: { good: 200, poor: 500, unit: 'ms' },
  cls: { good: 0.1, poor: 0.25, unit: '' },
  fcp: { good: 1800, poor: 3000, unit: 'ms' },
  ttfb: { good: 800, poor: 1800, unit: 'ms' },
} as const;

export const EVENT_TYPE = {
  pageView: 1,
  customEvent: 2,
  performance: 5,
} as const;

export const HEATMAP_EVENT_TYPE = {
  click: 1,
  scroll: 2,
} as const;

// share.share_type values; 2-4 (link, pixel, board) were removed in migration 28.
export const ENTITY_TYPE = {
  website: 1,
} as const;

export const DATA_TYPE = {
  string: 1,
  number: 2,
  boolean: 3,
  date: 4,
  array: 5,
} as const;

export const OPERATORS = {
  equals: 'eq',
  notEquals: 'neq',
  set: 's',
  notSet: 'ns',
  contains: 'c',
  doesNotContain: 'dnc',
  regex: 're',
  notRegex: 'nre',
  true: 't',
  false: 'f',
  greaterThan: 'gt',
  lessThan: 'lt',
  greaterThanEquals: 'gte',
  lessThanEquals: 'lte',
  before: 'bf',
  after: 'af',
} as const;

export const DATA_TYPES = {
  [DATA_TYPE.string]: 'string',
  [DATA_TYPE.number]: 'number',
  [DATA_TYPE.boolean]: 'boolean',
  [DATA_TYPE.date]: 'date',
  [DATA_TYPE.array]: 'array',
} as const;

export const ROLES = {
  admin: 'admin',
  user: 'user',
  viewOnly: 'view-only',
} as const;

export const PERMISSIONS = {
  all: 'all',
  websiteCreate: 'website:create',
  websiteUpdate: 'website:update',
  websiteDelete: 'website:delete',
} as const;

export const ROLE_PERMISSIONS = {
  [ROLES.admin]: [PERMISSIONS.all],
  [ROLES.user]: [PERMISSIONS.websiteCreate, PERMISSIONS.websiteUpdate, PERMISSIONS.websiteDelete],
  [ROLES.viewOnly]: [],
} as const;

// Chart colours from opencode's docs: their link blue for the main series,
// --muted axis text, --border grid lines and --surface fills
// (src/app/opencode.css, global.css for light). Canvas cannot read CSS
// variables, so keep these equal to the tokens.
export const THEME_COLORS = {
  light: {
    primary: '#4d8eff',
    text: '#646262',
    line: '#e0dede',
    fill: '#f8f7f7',
  },
  dark: {
    primary: '#4d8eff',
    text: '#929292',
    line: '#303030',
    fill: '#101010',
  },
} as const;

// Series palette: opencode's link blue, then their HTTP method colours
// (GET, POST, PUT, DELETE), then further hues for long series.
export const CHART_COLORS = [
  '#4d8eff',
  '#70c997',
  '#e0af68',
  '#e67c7c',
  '#73a7ff',
  '#7a4a6b',
  '#4a6283',
  '#8a8a2e',
  '#c49a2c',
  '#5f8a5b',
  '#b06a8f',
  '#9c6b3f',
];

export const DOMAIN_REGEX =
  /^(localhost(:[1-9]\d{0,4})?|((?=[a-z0-9-_]{1,63}\.)(xn--)?[a-z0-9-_]+(-[a-z0-9-_]+)*\.)+(xn--)?[a-z0-9-_]{2,63})$/;
export const DATETIME_REGEX =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?(Z|\+[0-9]{2}:[0-9]{2})?$/;

export const FIELD_LENGTH = {
  browser: 20,
  os: 20,
  device: 20,
  screen: 11,
  language: 35,
  country: 2,
  region: 20,
  city: 50,
  ip: 45,
  org: 100,
  distinctId: 50,
  url: 500,
  pageTitle: 500,
  eventName: 50,
  tag: 50,
  hostname: 100,
  fieldValue: 255,
  dataKey: 500,
  stringValue: 500,
} as const;

export const UTM_PARAMS = ['utm_campaign', 'utm_content', 'utm_medium', 'utm_source', 'utm_term'];

export const OS_NAMES = {
  'Android OS': 'Android',
  'Chrome OS': 'ChromeOS',
  'Mac OS': 'macOS',
  'Sun OS': 'SunOS',
  'Windows 10': 'Windows 10/11',
} as const;

export const BROWSERS = {
  android: 'Android',
  aol: 'AOL',
  bb10: 'BlackBerry 10',
  beaker: 'Beaker',
  browser: 'Unknown',
  chrome: 'Chrome',
  'chromium-webview': 'Chrome (webview)',
  crios: 'Chrome (iOS)',
  curl: 'Curl',
  edge: 'Edge',
  'edge-chromium': 'Edge (Chromium)',
  'edge-ios': 'Edge (iOS)',
  facebook: 'Facebook',
  firefox: 'Firefox',
  fxios: 'Firefox (iOS)',
  ie: 'IE',
  instagram: 'Instagram',
  ios: 'iOS',
  'ios-webview': 'iOS (webview)',
  kakaotalk: 'KakaoTalk',
  miui: 'MIUI',
  opera: 'Opera',
  'opera-mini': 'Opera Mini',
  phantomjs: 'PhantomJS',
  safari: 'Safari',
  samsung: 'Samsung',
  searchbot: 'Searchbot',
  silk: 'Silk',
  yandexbrowser: 'Yandex',
} as const;

export const SOCIAL_DOMAINS = [
  'bsky.app',
  'facebook.com',
  'fb.com',
  'ig.com',
  'instagram.com',
  'linkedin.',
  'news.ycombinator.com',
  'pinterest.',
  'reddit.',
  'snapchat.',
  't.co',
  'threads.net',
  'tiktok.',
  'twitter.com',
  'x.com',
];

export const SEARCH_DOMAINS = [
  'baidu.com',
  'bing.com',
  'duckduckgo.com',
  'ecosia.org',
  'google.',
  'msn.com',
  'search.brave.com',
  'yandex.',
];

export const LLM_DOMAINS = [
  'chatgpt.com',
  'claude.ai',
  'copilot.microsoft.com',
  'gemini.google.com',
  'meta.ai',
  'perplexity.ai',
];

export const SHOPPING_DOMAINS = [
  'alibaba.com',
  'aliexpress.com',
  'amazon.',
  'bestbuy.com',
  'ebay.com',
  'etsy.com',
  'newegg.com',
  'target.com',
  'walmart.com',
];

export const EMAIL_DOMAINS = [
  'gmail.',
  'hotmail.',
  'mail.yahoo.',
  'outlook.',
  'proton.me',
  'protonmail.',
];

export const VIDEO_DOMAINS = ['twitch.', 'youtube.'];

export const PAID_AD_PARAMS = [
  'ad_id=',
  'aid=',
  'dclid=',
  'epik=',
  'gclid=',
  'li_fat_id=',
  'msclkid=',
  'ob_click_id=',
  'pc_id=',
  'rdt_cid=',
  'scid=',
  'ttclid=',
  'twclid=',
  'utm_medium=cpc',
  'utm_medium=paid',
  'utm_medium=paid_social',
  'utm_source=google',
];

export const GROUPED_DOMAINS = [
  { name: 'Baidu', domain: 'baidu.com', match: 'baidu.' },
  { name: 'Bing', domain: 'bing.com', match: 'bing.' },
  { name: 'Brave', domain: 'brave.com', match: 'brave.' },
  { name: 'ChatGPT', domain: 'chatgpt.com', match: 'chatgpt.' },
  { name: 'DuckDuckGo', domain: 'duckduckgo.com', match: 'duckduckgo.' },
  { name: 'Facebook', domain: 'facebook.com', match: 'facebook.' },
  { name: 'GitHub', domain: 'github.com', match: 'github.' },
  { name: 'Google', domain: 'google.com', match: 'google.' },
  { name: 'Hacker News', domain: 'news.ycombinator.com', match: 'news.ycombinator.com' },
  { name: 'Instagram', domain: 'instagram.com', match: ['instagram.', 'ig.com'] },
  { name: 'LinkedIn', domain: 'linkedin.com', match: 'linkedin.' },
  { name: 'Pinterest', domain: 'pinterest.com', match: 'pinterest.' },
  { name: 'Reddit', domain: 'reddit.com', match: 'reddit.' },
  { name: 'Snapchat', domain: 'snapchat.com', match: 'snapchat.' },
  { name: 'Twitter', domain: 'twitter.com', match: ['twitter.', 't.co', 'x.com'] },
  { name: 'Yahoo', domain: 'yahoo.com', match: 'yahoo.' },
  { name: 'Yandex', domain: 'yandex.ru', match: 'yandex.' },
];

export const MAP_FILE = '/datamaps.world.json';

export const ISO_COUNTRIES = {
  ABW: 'AW',
  AFG: 'AF',
  AGO: 'AO',
  AIA: 'AI',
  ALA: 'AX',
  ALB: 'AL',
  AND: 'AD',
  ANT: 'AN',
  ARE: 'AE',
  ARG: 'AR',
  ARM: 'AM',
  ASM: 'AS',
  ATF: 'TF',
  ATG: 'AG',
  AUS: 'AU',
  AUT: 'AT',
  AZE: 'AZ',
  BDI: 'BI',
  BEL: 'BE',
  BEN: 'BJ',
  BFA: 'BF',
  BGD: 'BD',
  BGR: 'BG',
  BHR: 'BH',
  BHS: 'BS',
  BIH: 'BA',
  BLR: 'BY',
  BLZ: 'BZ',
  BLM: 'BL',
  BMU: 'BM',
  BOL: 'BO',
  BRA: 'BR',
  BRB: 'BB',
  BRN: 'BN',
  BTN: 'BT',
  BVT: 'BV',
  BWA: 'BW',
  CAF: 'CF',
  CAN: 'CA',
  CCK: 'CC',
  CHE: 'CH',
  CHL: 'CL',
  CHN: 'CN',
  CIV: 'CI',
  CMR: 'CM',
  COD: 'CD',
  COG: 'CG',
  COK: 'CK',
  COL: 'CO',
  COM: 'KM',
  CPV: 'CV',
  CRI: 'CR',
  CUB: 'CU',
  CXR: 'CX',
  CYM: 'KY',
  CYP: 'CY',
  CZE: 'CZ',
  DEU: 'DE',
  DJI: 'DJ',
  DMA: 'DM',
  DNK: 'DK',
  DOM: 'DO',
  DZA: 'DZ',
  ECU: 'EC',
  EGY: 'EG',
  ERI: 'ER',
  ESH: 'EH',
  ESP: 'ES',
  EST: 'EE',
  ETH: 'ET',
  FIN: 'FI',
  FJI: 'FJ',
  FLK: 'FK',
  FRA: 'FR',
  FRO: 'FO',
  FSM: 'FM',
  GAB: 'GA',
  GBR: 'GB',
  GEO: 'GE',
  GGY: 'GG',
  GHA: 'GH',
  GIB: 'GI',
  GIN: 'GN',
  GLP: 'GP',
  GMB: 'GM',
  GNB: 'GW',
  GNQ: 'GQ',
  GRC: 'GR',
  GRD: 'GD',
  GRL: 'GL',
  GTM: 'GT',
  GUF: 'GF',
  GUM: 'GU',
  GUY: 'GY',
  HKG: 'HK',
  HMD: 'HM',
  HND: 'HN',
  HRV: 'HR',
  HTI: 'HT',
  HUN: 'HU',
  IDN: 'ID',
  IMN: 'IM',
  IND: 'IN',
  IOT: 'IO',
  IRL: 'IE',
  IRN: 'IR',
  IRQ: 'IQ',
  ISL: 'IS',
  ISR: 'IL',
  ITA: 'IT',
  JAM: 'JM',
  JEY: 'JE',
  JOR: 'JO',
  JPN: 'JP',
  KAZ: 'KZ',
  KEN: 'KE',
  KGZ: 'KG',
  KHM: 'KH',
  KIR: 'KI',
  KNA: 'KN',
  KOR: 'KR',
  KWT: 'KW',
  LAO: 'LA',
  LBN: 'LB',
  LBR: 'LR',
  LBY: 'LY',
  LCA: 'LC',
  LIE: 'LI',
  LKA: 'LK',
  LSO: 'LS',
  LTU: 'LT',
  LUX: 'LU',
  LVA: 'LV',
  MAF: 'MF',
  MAR: 'MA',
  MCO: 'MC',
  MDA: 'MD',
  MDG: 'MG',
  MDV: 'MV',
  MEX: 'MX',
  MHL: 'MH',
  MKD: 'MK',
  MLI: 'ML',
  MLT: 'MT',
  MMR: 'MM',
  MNE: 'ME',
  MNG: 'MN',
  MNP: 'MP',
  MOZ: 'MZ',
  MRT: 'MR',
  MSR: 'MS',
  MTQ: 'MQ',
  MUS: 'MU',
  MWI: 'MW',
  MYS: 'MY',
  MYT: 'YT',
  NAM: 'NA',
  NCL: 'NC',
  NER: 'NE',
  NFK: 'NF',
  NGA: 'NG',
  NIC: 'NI',
  NIU: 'NU',
  NLD: 'NL',
  NOR: 'NO',
  NPL: 'NP',
  NRU: 'NR',
  NZL: 'NZ',
  OMN: 'OM',
  PAK: 'PK',
  PAN: 'PA',
  PCN: 'PN',
  PER: 'PE',
  PHL: 'PH',
  PLW: 'PW',
  PNG: 'PG',
  POL: 'PL',
  PRI: 'PR',
  PRK: 'KP',
  PRT: 'PT',
  PRY: 'PY',
  PSE: 'PS',
  PYF: 'PF',
  QAT: 'QA',
  REU: 'RE',
  ROU: 'RO',
  RUS: 'RU',
  RWA: 'RW',
  SAU: 'SA',
  SDN: 'SD',
  SEN: 'SN',
  SGP: 'SG',
  SGS: 'GS',
  SHN: 'SH',
  SJM: 'SJ',
  SLB: 'SB',
  SLE: 'SL',
  SLV: 'SV',
  SMR: 'SM',
  SOM: 'SO',
  SPM: 'PM',
  SRB: 'RS',
  SUR: 'SR',
  STP: 'ST',
  SVK: 'SK',
  SVN: 'SI',
  SWE: 'SE',
  SWZ: 'SZ',
  SYC: 'SC',
  SYR: 'SY',
  TCA: 'TC',
  TCD: 'TD',
  TGO: 'TG',
  THA: 'TH',
  TJK: 'TJ',
  TKL: 'TK',
  TKM: 'TM',
  TLS: 'TL',
  TON: 'TO',
  TTO: 'TT',
  TUN: 'TN',
  TUR: 'TR',
  TUV: 'TV',
  TWN: 'TW',
  TZA: 'TZ',
  UGA: 'UG',
  UKR: 'UA',
  UMI: 'UM',
  URY: 'UY',
  USA: 'US',
  UZB: 'UZ',
  VAT: 'VA',
  VCT: 'VC',
  VEN: 'VE',
  VGB: 'VG',
  VIR: 'VI',
  VNM: 'VN',
  VUT: 'VU',
  WLF: 'WF',
  WSM: 'WS',
  XKX: 'XK',
  YEM: 'YE',
  ZAF: 'ZA',
  ZMB: 'ZM',
  ZWE: 'ZW',
};

export const TIMEZONE_LEGACY: Record<string, string> = {
  'Asia/Batavia': 'Asia/Jakarta',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Chongqing': 'Asia/Shanghai',
  'Asia/Harbin': 'Asia/Shanghai',
  'Asia/Jayapura': 'Asia/Pontianak',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Macao': 'Asia/Macau',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Europe/Kiev': 'Europe/Kyiv',
  'Europe/Zaporozhye': 'Europe/Kyiv',
  'Etc/UTC': 'UTC',
  'US/Arizona': 'America/Phoenix',
  'US/Central': 'America/Chicago',
  'US/Eastern': 'America/New_York',
  'US/Mountain': 'America/Denver',
  'US/Pacific': 'America/Los_Angeles',
  'US/Samoa': 'Pacific/Pago_Pago',
};

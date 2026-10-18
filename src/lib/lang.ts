import { enUS, zhCN } from 'date-fns/locale';

// Dashboard languages, English and Simplified Chinese only (owner's request,
// 2026-10-11); each needs public/intl/{messages,country,language}/<code>.json.
// `short` and `long` are date-fns patterns for a timestamp to the minute (the
// seconds are drawn separately), in each language's own order.
export const languages = {
  'en-US': {
    label: 'English',
    dateLocale: enUS,
    datePatterns: { short: 'd MMM HH:mm', long: 'd MMM yyyy HH:mm' },
  },
  'zh-CN': {
    label: '简体中文',
    dateLocale: zhCN,
    datePatterns: { short: 'M月d日 HH:mm', long: 'yyyy年M月d日 HH:mm' },
  },
};

/** A supported locale code, or English for anything else (e.g. a stored zh-TW). */
export function toLanguage(locale?: string | null) {
  return locale && locale in languages ? locale : 'en-US';
}

export function getDateLocale(locale: string) {
  return languages[locale]?.dateLocale || enUS;
}

export function getDatePatterns(locale: string) {
  return languages[toLanguage(locale)].datePatterns;
}

export function getTextDirection(locale: string) {
  // Add `dir: 'rtl'` to a language entry for right-to-left scripts.
  return (languages[locale] as { dir?: string } | undefined)?.dir || 'ltr';
}

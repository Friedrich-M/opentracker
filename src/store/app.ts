import { create } from 'zustand';
import {
  DATE_RANGE_CONFIG,
  DEFAULT_DATE_RANGE_VALUE,
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  TIMEZONE_CONFIG,
} from '@/lib/constants';
import { getTimezone } from '@/lib/date';
import { toLanguage } from '@/lib/lang';
import { getItem } from '@/lib/storage';

const initialState = {
  locale: toLanguage(getItem(LOCALE_CONFIG) || process.env.defaultLocale || DEFAULT_LOCALE),
  timezone: getItem(TIMEZONE_CONFIG) || getTimezone(),
  dateRangeValue: getItem(DATE_RANGE_CONFIG) || DEFAULT_DATE_RANGE_VALUE,
  share: null,
  shareToken: null,
  user: null,
};

const store = create(() => ({ ...initialState }));

export function setTimezone(timezone: string) {
  store.setState({ timezone });
}

export function setLocale(locale: string) {
  store.setState({ locale });
}

export function setShareData(share: object | null, shareToken: { token?: string } | null) {
  store.setState({ share, shareToken });
}

export function setUser(user: object) {
  store.setState({ user });
}

export const useApp = store;

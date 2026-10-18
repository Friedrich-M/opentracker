import { colord } from 'colord';
import { THEME_COLORS } from '@/lib/constants';

export function hex6(str: string) {
  let h = 0x811c9dc5; // FNV-1a 32-bit offset
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h >>> 0) * 0x01000193; // FNV prime
  }
  // use lower 24 bits; pad to 6 hex chars
  return ((h >>> 0) & 0xffffff).toString(16).padStart(6, '0');
}

export function getThemeColors(theme: string) {
  const { primary, text, line, fill } = THEME_COLORS[theme];
  const primaryColor = colord(THEME_COLORS[theme].primary);

  return {
    colors: {
      theme: {
        ...THEME_COLORS[theme],
      },
      chart: {
        text,
        line,
        views: {
          hoverBackgroundColor: primaryColor.alpha(0.7).toRgbString(),
          backgroundColor: primaryColor.alpha(0.4).toRgbString(),
          borderColor: primaryColor.alpha(0.7).toRgbString(),
          hoverBorderColor: primaryColor.toRgbString(),
        },
        visitors: {
          hoverBackgroundColor: primaryColor.alpha(0.9).toRgbString(),
          backgroundColor: primaryColor.alpha(0.6).toRgbString(),
          borderColor: primaryColor.alpha(0.9).toRgbString(),
          hoverBorderColor: primaryColor.toRgbString(),
        },
      },
      map: {
        baseColor: primary,
        fillColor: fill,
        strokeColor: primary,
        hoverColor: primary,
      },
    },
  };
}

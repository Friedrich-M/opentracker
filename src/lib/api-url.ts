function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

/** The dashboard's API calls: absolute URLs as given, the rest under /api. */
export function getApiUrl(url: string) {
  if (isAbsoluteUrl(url)) {
    return url;
  }

  return `/api/${url.replace(/^\/+/, '')}`;
}

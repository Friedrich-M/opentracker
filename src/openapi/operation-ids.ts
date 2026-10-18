/**
 * Canonical operation IDs for routes that rely on source-inferred contracts.
 *
 * Operation IDs become method names in generated API clients, so they are part of
 * the public contract. Entries here override the mechanical path-segment naming used by
 * `src/openapi/infer.ts`. Curated `contract.ts` modules set their own `operationId` directly.
 *
 * Keys are `${METHOD} ${path}` as produced by `getOperationKey`.
 */
const OPERATION_ID_OVERRIDES: Record<string, string> = {
  // Account
  'GET /api/me/api-keys': 'getMyApiKeys',
  'GET /api/me/visitor-labels': 'getMyVisitorLabel',
  'POST /api/me/visitor-labels': 'saveMyVisitorLabel',
  'DELETE /api/me/visitor-labels': 'deleteMyVisitorLabel',
  'POST /api/me/api-keys': 'createMyApiKey',
  'DELETE /api/me/api-keys/{keyId}': 'deleteMyApiKey',
  'POST /api/me/password': 'updateMyPassword',
  'GET /api/me/websites': 'getMyWebsites',

  // Auth
  'POST /api/auth/logout': 'logout',
  'POST /api/auth/verify': 'verify',

  // Two-factor authentication
  'GET /api/2fa/status': 'getTwoFactorStatus',
  'POST /api/2fa/setup/initiate': 'initiateTwoFactorSetup',
  'POST /api/2fa/setup/confirm': 'confirmTwoFactorSetup',
  'POST /api/2fa/setup/cancel': 'cancelTwoFactorSetup',
  'POST /api/2fa/disable': 'disableTwoFactor',
  'POST /api/2fa/verify': 'verifyTwoFactor',

  // Realtime
  'GET /api/realtime/{websiteId}': 'getRealtime',

  // Users
  'POST /api/users': 'createUser',
  'GET /api/users/{userId}': 'getUser',
  'POST /api/users/{userId}': 'updateUser',
  'DELETE /api/users/{userId}': 'deleteUser',
  'GET /api/users/{userId}/websites': 'getUserWebsites',

  // Shares
  'GET /api/share/{slug}': 'getShareBySlug',
  'GET /api/share/id/{shareId}': 'getShare',
  'POST /api/share/id/{shareId}': 'updateShare',
  'DELETE /api/share/id/{shareId}': 'deleteShare',

  // Websites
  'GET /api/websites/charts': 'getWebsitesCharts',
  'GET /api/websites/{websiteId}/active': 'getWebsiteActive',
  'GET /api/websites/{websiteId}/daterange': 'getWebsiteDateRange',
  'GET /api/websites/{websiteId}/stats': 'getWebsiteStats',
  'GET /api/websites/{websiteId}/pageviews': 'getWebsitePageviews',
  'GET /api/websites/{websiteId}/metrics': 'getWebsiteMetrics',
  'GET /api/websites/{websiteId}/metrics/expanded': 'getWebsiteExpandedMetrics',
  'GET /api/websites/{websiteId}/values': 'getWebsiteValues',
  'GET /api/websites/{websiteId}/export': 'exportWebsite',
  'POST /api/websites/{websiteId}/reset': 'resetWebsite',
  'GET /api/websites/{websiteId}/shares': 'getWebsiteShares',
  'POST /api/websites/{websiteId}/shares': 'createWebsiteShare',
  'GET /api/websites/{websiteId}/recorder': 'getWebsiteRecorderConfig',

  // Annotations
  'GET /api/websites/{websiteId}/annotations': 'getWebsiteAnnotations',
  'POST /api/websites/{websiteId}/annotations': 'createWebsiteAnnotation',
  'GET /api/websites/{websiteId}/annotations/{annotationId}': 'getWebsiteAnnotation',
  'POST /api/websites/{websiteId}/annotations/{annotationId}': 'updateWebsiteAnnotation',
  'DELETE /api/websites/{websiteId}/annotations/{annotationId}': 'deleteWebsiteAnnotation',

  // Segments
  'GET /api/websites/{websiteId}/segments': 'getWebsiteSegments',
  'POST /api/websites/{websiteId}/segments': 'createWebsiteSegment',
  'GET /api/websites/{websiteId}/segments/{segmentId}': 'getWebsiteSegment',
  'POST /api/websites/{websiteId}/segments/{segmentId}': 'updateWebsiteSegment',
  'DELETE /api/websites/{websiteId}/segments/{segmentId}': 'deleteWebsiteSegment',

  // Events
  'GET /api/websites/{websiteId}/events': 'getWebsiteEvents',
  'GET /api/websites/{websiteId}/events/stats': 'getWebsiteEventStats',
  'GET /api/websites/{websiteId}/events/series': 'getWebsiteEventSeries',
  'GET /api/websites/{websiteId}/event-data/{eventId}': 'getEventDataById',
  'GET /api/websites/{websiteId}/event-data/fields': 'getEventDataFields',
  'GET /api/websites/{websiteId}/event-data/properties': 'getEventDataProperties',
  'GET /api/websites/{websiteId}/event-data/values': 'getEventDataValues',
  'GET /api/websites/{websiteId}/event-data-pivot': 'getEventDataPivot',
  'GET /api/websites/{websiteId}/event-data-pivot/array-series': 'getEventDataArraySeries',
  'GET /api/websites/{websiteId}/event-data-pivot/date-series': 'getEventDataDateSeries',
  'GET /api/websites/{websiteId}/event-data-pivot/numeric-series': 'getEventDataNumericSeries',
  'GET /api/websites/{websiteId}/event-data-pivot/numeric-stats': 'getEventDataNumericStats',
  'GET /api/websites/{websiteId}/event-data-pivot/property-series': 'getEventDataPropertySeries',

  // Sessions
  'GET /api/websites/{websiteId}/sessions': 'getWebsiteSessions',
  'GET /api/websites/{websiteId}/sessions/weekly': 'getWebsiteSessionsWeekly',
  'GET /api/websites/{websiteId}/sessions/{sessionId}': 'getWebsiteSession',
  'DELETE /api/websites/{websiteId}/sessions/{sessionId}': 'deleteWebsiteSession',
  'GET /api/websites/{websiteId}/sessions/{sessionId}/paths': 'getWebsiteSessionPaths',
  'GET /api/websites/{websiteId}/sessions/{sessionId}/network': 'getWebsiteSessionNetwork',
  'GET /api/websites/{websiteId}/sessions/{sessionId}/properties': 'getWebsiteSessionProperties',
  'GET /api/websites/{websiteId}/sessions/{sessionId}/replays': 'getWebsiteSessionReplays',
  'GET /api/websites/{websiteId}/session-data-pivot': 'getSessionDataPivot',
  'GET /api/websites/{websiteId}/session-data/array-series': 'getSessionDataArraySeries',
  'GET /api/websites/{websiteId}/session-data/date-series': 'getSessionDataDateSeries',
  'GET /api/websites/{websiteId}/session-data/numeric-series': 'getSessionDataNumericSeries',
  'GET /api/websites/{websiteId}/session-data/numeric-stats': 'getSessionDataNumericStats',
  'GET /api/websites/{websiteId}/session-data/properties': 'getSessionDataProperties',
  'GET /api/websites/{websiteId}/session-data/property-series': 'getSessionDataPropertySeries',
  'GET /api/websites/{websiteId}/session-data/stats': 'getSessionDataStats',
  'GET /api/websites/{websiteId}/session-data/values': 'getSessionDataValues',

  // Replays
  'GET /api/websites/{websiteId}/replays': 'getWebsiteReplays',
  'GET /api/websites/{websiteId}/replays/{replayId}': 'getWebsiteReplay',
  'GET /api/websites/{websiteId}/replays/saved': 'getWebsiteSavedReplays',
  'GET /api/websites/{websiteId}/replays/saved/{replayId}': 'getWebsiteReplaySaved',
  'POST /api/websites/{websiteId}/replays/saved/{replayId}': 'saveWebsiteReplay',

  // Collection
  'POST /api/send': 'send',
  'POST /api/record': 'record',
};

export function getOperationIdOverride(method: string, path: string) {
  return OPERATION_ID_OVERRIDES[`${method.toUpperCase()} ${path}`];
}

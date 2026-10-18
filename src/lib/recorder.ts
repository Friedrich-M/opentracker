export interface RecorderConfig {
  replayEnabled?: boolean;
  heatmapEnabled?: boolean;
  sampleRate?: number;
  // Replay sample rate per page `data-tag`, overriding sampleRate.
  tagSampleRates?: Record<string, number>;
  heatmapSampleRate?: number;
  maskLevel?: 'strict' | 'moderate';
  maxDuration?: number;
  blockSelector?: string;
}

// Replays are kept only for visitors in these countries (owner, 2026-10-16);
// heatmaps are recorded everywhere.
const REPLAY_COUNTRIES = ['US', 'CN', 'HK', 'SG'];

export function isReplayCountry(country: string | null | undefined) {
  return !!country && REPLAY_COUNTRIES.includes(country.toUpperCase());
}

export function getRecorderConfig(value: unknown): RecorderConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const config = value as Record<string, unknown>;
  const nextConfig: RecorderConfig = {};

  if (config.replayEnabled === true) {
    nextConfig.replayEnabled = true;
  }

  if (config.heatmapEnabled === true) {
    nextConfig.heatmapEnabled = true;
  }

  if (typeof config.sampleRate === 'number') {
    nextConfig.sampleRate = config.sampleRate;
  }

  if (
    config.tagSampleRates &&
    typeof config.tagSampleRates === 'object' &&
    !Array.isArray(config.tagSampleRates)
  ) {
    const rates = Object.entries(config.tagSampleRates).filter(
      ([, rate]) => typeof rate === 'number' && rate >= 0 && rate <= 1,
    );

    if (rates.length) {
      nextConfig.tagSampleRates = Object.fromEntries(rates);
    }
  }

  if (typeof config.heatmapSampleRate === 'number') {
    nextConfig.heatmapSampleRate = config.heatmapSampleRate;
  }

  if (config.maskLevel === 'strict' || config.maskLevel === 'moderate') {
    nextConfig.maskLevel = config.maskLevel;
  }

  if (typeof config.maxDuration === 'number' && Number.isFinite(config.maxDuration)) {
    nextConfig.maxDuration = Math.round(config.maxDuration);
  }

  if (typeof config.blockSelector === 'string') {
    nextConfig.blockSelector = config.blockSelector;
  }

  return nextConfig;
}

export function getRecorderEnabled(config: unknown) {
  const { replayEnabled, heatmapEnabled } = getRecorderConfig(config);

  return replayEnabled === true || heatmapEnabled === true;
}

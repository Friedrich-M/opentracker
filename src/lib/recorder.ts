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
// heatmaps are recorded everywhere. REPLAY_COUNTRIES replaces the list with
// comma-separated ISO codes, or `*` for every country.
const DEFAULT_REPLAY_COUNTRIES = ['US', 'CN', 'HK', 'SG'];

function getReplayCountries(): string[] | '*' {
  const value = process.env.REPLAY_COUNTRIES?.trim();

  if (!value) {
    return DEFAULT_REPLAY_COUNTRIES;
  }

  if (value === '*') {
    return '*';
  }

  return value
    .split(',')
    .map(code => code.trim().toUpperCase())
    .filter(Boolean);
}

export function isReplayCountry(country: string | null | undefined) {
  const countries = getReplayCountries();

  return !!country && (countries === '*' || countries.includes(country.toUpperCase()));
}

// Replay chunks one visit may store (REPLAY_MAX_CHUNKS_PER_VISIT). The
// recorder sends a chunk about every two seconds and stops a page's recording
// after its maximum duration (five minutes by default), so a visit rarely
// needs more; the cap bounds a script that keeps uploading under one token.
const DEFAULT_MAX_REPLAY_CHUNKS = 600;

export function getMaxReplayChunks() {
  const value = Number(process.env.REPLAY_MAX_CHUNKS_PER_VISIT);

  return Number.isInteger(value) && value > 0 ? value : DEFAULT_MAX_REPLAY_CHUNKS;
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

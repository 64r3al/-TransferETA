import type { ConfigOptions, Results } from "@cloudflare/speedtest";

/**
 * Enhanced bounded sample plan: 25 idle-latency probes and up to 10 throughput
 * samples per direction across three payload sizes. Median bandwidth reduces
 * the influence of short-lived high outliers. Maximum configured payload: 80.1 MB.
 */
export const SPEED_TEST_MEASUREMENTS: NonNullable<ConfigOptions["measurements"]> = [
  { type: "latency", numPackets: 5 },
  { type: "download", bytes: 100_000, count: 1, bypassMinDuration: true },
  { type: "latency", numPackets: 20 },
  { type: "download", bytes: 1_000_000, count: 5 },
  { type: "download", bytes: 5_000_000, count: 3 },
  { type: "download", bytes: 10_000_000, count: 2 },
  { type: "upload", bytes: 1_000_000, count: 5 },
  { type: "upload", bytes: 5_000_000, count: 3 },
  { type: "upload", bytes: 10_000_000, count: 2 },
];

export const SPEED_TEST_MAX_PAYLOAD_BYTES = SPEED_TEST_MEASUREMENTS.reduce(
  (total, measurement) =>
    total +
    (measurement.type === "download" || measurement.type === "upload"
      ? measurement.bytes * measurement.count
      : 0),
  0,
);

export const SPEED_TEST_CONFIG = {
  autoStart: false,
  logAimApiUrl: null,
  logMeasurementApiUrl: null,
  includeCredentials: false,
  bandwidthPercentile: 0.5,
  bandwidthFinishRequestDuration: 1_000,
  abortRequestDuration: 12_000,
  abortTestDuration: 65_000,
  measureDownloadLoadedLatency: true,
  measureUploadLoadedLatency: true,
  measurements: SPEED_TEST_MEASUREMENTS,
} satisfies ConfigOptions;

export interface BandwidthSampleSummary {
  sampleCount: number;
  medianBitsPerSecond: number | null;
  p10BitsPerSecond: number | null;
  p90BitsPerSecond: number | null;
  spreadPercent: number | null;
}

export interface NetworkSpeedMetrics {
  downloadBitsPerSecond: number | null;
  uploadBitsPerSecond: number | null;
  idleLatencyMs: number | null;
  idleJitterMs: number | null;
  downloadLoadedLatencyMs: number | null;
  uploadLoadedLatencyMs: number | null;
  downloadLoadedJitterMs: number | null;
  uploadLoadedJitterMs: number | null;
  durationMs: number | null;
  downloadSamples: number[];
  uploadSamples: number[];
  downloadSpreadPercent: number | null;
  uploadSpreadPercent: number | null;
}

function readFiniteMetric(read: () => number | null | undefined): number | null {
  try {
    const value = read();
    return typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : null;
  } catch {
    return null;
  }
}

function readPositiveMetric(read: () => number | null | undefined): number | null {
  const value = readFiniteMetric(read);
  return value !== null && value > 0 ? value : null;
}

function readBandwidthSamples(read: () => readonly { bps: number }[]): number[] {
  try {
    const points = read();
    if (!Array.isArray(points)) return [];
    return points
      .map((point) => point?.bps)
      .filter((value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value > 0,
      );
  } catch {
    return [];
  }
}

function percentile(sortedValues: readonly number[], fraction: number): number | null {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0] ?? null;
  const rank = (sortedValues.length - 1) * fraction;
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const lower = sortedValues[lowerIndex];
  const upper = sortedValues[upperIndex];
  if (lower === undefined || upper === undefined) return null;
  return lower + (upper - lower) * (rank - lowerIndex);
}

/** Summarize the distribution of valid per-request throughput samples. */
export function summarizeBandwidthSamples(samples: readonly number[]): BandwidthSampleSummary {
  const sorted = samples
    .filter((value) => Number.isFinite(value) && value > 0)
    .slice()
    .sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const p10 = percentile(sorted, 0.1);
  const p90 = percentile(sorted, 0.9);
  return {
    sampleCount: sorted.length,
    medianBitsPerSecond: median,
    p10BitsPerSecond: p10,
    p90BitsPerSecond: p90,
    spreadPercent:
      sorted.length >= 4 && median !== null && median > 0 && p10 !== null && p90 !== null
        ? ((p90 - p10) / median) * 100
        : null,
  };
}

export function readNetworkSpeedMetrics(results: Results): NetworkSpeedMetrics {
  const downloadSamples = readBandwidthSamples(() => results.getDownloadBandwidthPoints());
  const uploadSamples = readBandwidthSamples(() => results.getUploadBandwidthPoints());
  const downloadSummary = summarizeBandwidthSamples(downloadSamples);
  const uploadSummary = summarizeBandwidthSamples(uploadSamples);

  return {
    downloadBitsPerSecond:
      downloadSummary.medianBitsPerSecond ??
      readPositiveMetric(() => results.getDownloadBandwidth()),
    uploadBitsPerSecond:
      uploadSummary.medianBitsPerSecond ??
      readPositiveMetric(() => results.getUploadBandwidth()),
    idleLatencyMs: readFiniteMetric(() => results.getUnloadedLatency()),
    idleJitterMs: readFiniteMetric(() => results.getUnloadedJitter()),
    downloadLoadedLatencyMs: readFiniteMetric(() => results.getDownLoadedLatency()),
    uploadLoadedLatencyMs: readFiniteMetric(() => results.getUpLoadedLatency()),
    downloadLoadedJitterMs: readFiniteMetric(() => results.getDownLoadedJitter()),
    uploadLoadedJitterMs: readFiniteMetric(() => results.getUpLoadedJitter()),
    durationMs: readFiniteMetric(() => results.getTotalDurationMs()),
    downloadSamples,
    uploadSamples,
    downloadSpreadPercent: downloadSummary.spreadPercent,
    uploadSpreadPercent: uploadSummary.spreadPercent,
  };
}

/** Convert the measured bit/s value into the calculator's Mbps input field. */
export function measuredUploadToMbpsInput(bitsPerSecond: number): string | null {
  if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return null;
  const megabitsPerSecond = bitsPerSecond / 1_000_000;
  return Number.isFinite(megabitsPerSecond) && megabitsPerSecond > 0
    ? String(megabitsPerSecond)
    : null;
}

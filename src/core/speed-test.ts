import type { ConfigOptions, Results } from "@cloudflare/speedtest";

/**
 * Deliberately bounded browser test. The payload ceiling is about 36.4 MB:
 * 23.1 MB download + 13.3 MB upload. Faster connections may complete fewer
 * ramp-up rounds because the engine stops a direction after a sufficiently
 * long request. No packet-loss/TURN test is enabled.
 */
export const SPEED_TEST_MEASUREMENTS: NonNullable<ConfigOptions["measurements"]> = [
  { type: "latency", numPackets: 3 },
  { type: "download", bytes: 100_000, count: 1, bypassMinDuration: true },
  { type: "latency", numPackets: 6 },
  { type: "download", bytes: 1_000_000, count: 3 },
  { type: "upload", bytes: 100_000, count: 3 },
  { type: "upload", bytes: 1_000_000, count: 3 },
  { type: "download", bytes: 10_000_000, count: 2 },  { type: "upload", bytes: 5_000_000, count: 2 },
];

export const SPEED_TEST_MAX_PAYLOAD_BYTES = SPEED_TEST_MEASUREMENTS.reduce(
  (total, measurement) =>
    total +
    (measurement.type === "download" || measurement.type === "upload"
      ? measurement.bytes * measurement.count
      : 0),
  0,
);

/**
 * Explicitly disable Cloudflare's optional result/measurement logging APIs.
 * Test requests themselves still go to Cloudflare's edge and expose normal
 * connection metadata to that service.
 */
export const SPEED_TEST_CONFIG = {
  autoStart: false,
  logAimApiUrl: null,
  logMeasurementApiUrl: null,
  includeCredentials: false,
  bandwidthPercentile: 0.9,
  bandwidthFinishRequestDuration: 750,
  abortRequestDuration: 10_000,
  abortTestDuration: 45_000,
  measurements: SPEED_TEST_MEASUREMENTS,
} satisfies ConfigOptions;

export interface NetworkSpeedMetrics {
  downloadBitsPerSecond: number | null;
  uploadBitsPerSecond: number | null;
  idleLatencyMs: number | null;
  idleJitterMs: number | null;
  downloadLoadedLatencyMs: number | null;
  uploadLoadedLatencyMs: number | null;
  durationMs: number | null;
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

export function readNetworkSpeedMetrics(results: Results): NetworkSpeedMetrics {
  return {
    downloadBitsPerSecond: readPositiveMetric(() => results.getDownloadBandwidth()),
    uploadBitsPerSecond: readPositiveMetric(() => results.getUploadBandwidth()),
    idleLatencyMs: readFiniteMetric(() => results.getUnloadedLatency()),
    idleJitterMs: readFiniteMetric(() => results.getUnloadedJitter()),
    downloadLoadedLatencyMs: readFiniteMetric(() => results.getDownLoadedLatency()),
    uploadLoadedLatencyMs: readFiniteMetric(() => results.getUpLoadedLatency()),
    durationMs: readFiniteMetric(() => results.getTotalDurationMs()),
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

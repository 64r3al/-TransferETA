import { describe, expect, it } from "vitest";
import {
  measuredUploadToMbpsInput,
  readNetworkSpeedMetrics,
  summarizeBandwidthSamples,
  SPEED_TEST_CONFIG,
  SPEED_TEST_MAX_PAYLOAD_BYTES,
} from "../../src/core/speed-test";
import type { Results } from "@cloudflare/speedtest";

describe("Cloudflare precision speed-test configuration", () => {
  it("starts only on explicit opt-in and disables optional result logging", () => {
    expect(SPEED_TEST_CONFIG.autoStart).toBe(false);
    expect(SPEED_TEST_CONFIG.logAimApiUrl).toBeNull();
    expect(SPEED_TEST_CONFIG.logMeasurementApiUrl).toBeNull();
    expect(SPEED_TEST_CONFIG.includeCredentials).toBe(false);
  });

  it("uses median bandwidth and a larger repeated-sample plan", () => {
    expect(SPEED_TEST_CONFIG.bandwidthPercentile).toBe(0.5);
    expect(SPEED_TEST_CONFIG.measurements?.length).toBe(9);
    expect(SPEED_TEST_CONFIG.abortTestDuration).toBe(65_000);
    expect(SPEED_TEST_CONFIG.abortRequestDuration).toBe(12_000);
    expect(SPEED_TEST_MAX_PAYLOAD_BYTES).toBe(80_100_000);
    expect(SPEED_TEST_MAX_PAYLOAD_BYTES).toBeLessThan(81_000_000);
  });
});

describe("bandwidth sample analysis", () => {
  it("uses the median instead of allowing a single high outlier to dominate", () => {
    const summary = summarizeBandwidthSamples([
      10_000_000, 11_000_000, 12_000_000, 13_000_000, 14_000_000, 900_000_000,
    ]);
    expect(summary.sampleCount).toBe(6);
    expect(summary.medianBitsPerSecond).toBe(12_500_000);
    expect(summary.p10BitsPerSecond).toBe(10_500_000);
    expect(summary.p90BitsPerSecond).toBe(457_000_000);
    expect(summary.spreadPercent).toBeGreaterThan(100);
  });

  it("does not claim a consistency range when fewer than four samples exist", () => {
    const summary = summarizeBandwidthSamples([10, 12, 14]);
    expect(summary.medianBitsPerSecond).toBe(12);
    expect(summary.spreadPercent).toBeNull();
  });

  it("ignores invalid, zero, and negative samples", () => {
    const summary = summarizeBandwidthSamples([
      10, Number.NaN, 0, -4, 20, Number.POSITIVE_INFINITY,
    ]);
    expect(summary.sampleCount).toBe(2);
    expect(summary.medianBitsPerSecond).toBe(15);
  });
});

describe("speed-test result mapping", () => {
  it("maps sample arrays, medians, latency, and loaded jitter", () => {
    const fakeResults = {
      getDownloadBandwidthPoints: () => [
        { bps: 250_000_000 }, { bps: 240_000_000 },
        { bps: 260_000_000 }, { bps: 255_000_000 },
      ],
      getUploadBandwidthPoints: () => [
        { bps: 82_500_000 }, { bps: 80_000_000 },
        { bps: 85_000_000 }, { bps: 83_000_000 },
      ],
      getDownloadBandwidth: () => 250_000_000,
      getUploadBandwidth: () => 82_500_000,
      getUnloadedLatency: () => 21.7,
      getUnloadedJitter: () => 2.4,
      getDownLoadedLatency: () => 75.2,
      getUpLoadedLatency: () => 43.1,
      getDownLoadedJitter: () => 5.1,
      getUpLoadedJitter: () => 3.3,
      getTotalDurationMs: () => 18_250,
    } as unknown as Results;

    const metrics = readNetworkSpeedMetrics(fakeResults);
    expect(metrics.downloadBitsPerSecond).toBe(252_500_000);
    expect(metrics.uploadBitsPerSecond).toBe(82_750_000);
    expect(metrics.downloadSamples).toHaveLength(4);
    expect(metrics.uploadSamples).toHaveLength(4);
    expect(metrics.idleLatencyMs).toBe(21.7);
    expect(metrics.idleJitterMs).toBe(2.4);
    expect(metrics.downloadLoadedLatencyMs).toBe(75.2);
    expect(metrics.uploadLoadedLatencyMs).toBe(43.1);
    expect(metrics.downloadLoadedJitterMs).toBe(5.1);
    expect(metrics.uploadLoadedJitterMs).toBe(3.3);
    expect(metrics.durationMs).toBe(18_250);
    expect(metrics.uploadSpreadPercent).not.toBeNull();
  });

  it("handles unavailable or throwing raw sample getters without crashing", () => {
    const fakeResults = {
      getDownloadBandwidthPoints: () => { throw new Error("not measured"); },
      getUploadBandwidthPoints: () => [],
      getDownloadBandwidth: () => 0,
      getUploadBandwidth: () => { throw new Error("not measured"); },
      getUnloadedLatency: () => Number.NaN,
      getUnloadedJitter: () => null,
      getDownLoadedLatency: () => undefined,
      getUpLoadedLatency: () => undefined,
      getDownLoadedJitter: () => undefined,
      getUpLoadedJitter: () => undefined,
      getTotalDurationMs: () => undefined,
    } as unknown as Results;

    expect(readNetworkSpeedMetrics(fakeResults)).toMatchObject({
      downloadBitsPerSecond: null,
      uploadBitsPerSecond: null,
      idleLatencyMs: null,
      idleJitterMs: null,
      downloadLoadedLatencyMs: null,
      uploadLoadedLatencyMs: null,
      downloadLoadedJitterMs: null,
      uploadLoadedJitterMs: null,
      downloadSamples: [],
      uploadSamples: [],
    });
  });
});

describe("measured upload speed conversion", () => {
  it("converts measured bit/s to Mbps without display rounding", () => {
    expect(measuredUploadToMbpsInput(82_500_000)).toBe("82.5");
    expect(measuredUploadToMbpsInput(1_234_567)).toBe("1.234567");
  });

  it("rejects zero, negative, or non-finite upload results", () => {
    expect(measuredUploadToMbpsInput(0)).toBeNull();
    expect(measuredUploadToMbpsInput(-1)).toBeNull();
    expect(measuredUploadToMbpsInput(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

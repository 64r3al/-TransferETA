import { describe, expect, it } from "vitest";
import {
  measuredUploadToMbpsInput,
  readNetworkSpeedMetrics,
  SPEED_TEST_CONFIG,
  SPEED_TEST_MAX_PAYLOAD_BYTES,
} from "../../src/core/speed-test";
import type { Results } from "@cloudflare/speedtest";

describe("Cloudflare speed-test configuration", () => {
  it("does not start automatically or send optional result logs", () => {
    expect(SPEED_TEST_CONFIG.autoStart).toBe(false);
    expect(SPEED_TEST_CONFIG.logAimApiUrl).toBeNull();
    expect(SPEED_TEST_CONFIG.logMeasurementApiUrl).toBeNull();
    expect(SPEED_TEST_CONFIG.includeCredentials).toBe(false);
  });

  it("keeps the maximum configured payload below 37 MB", () => {
    expect(SPEED_TEST_MAX_PAYLOAD_BYTES).toBe(36_400_000);
    expect(SPEED_TEST_MAX_PAYLOAD_BYTES).toBeLessThan(37_000_000);
  });
});

describe("speed-test result mapping", () => {
  it("maps only finite measurements and preserves upload rate in bit/s", () => {
    const fakeResults = {
      getDownloadBandwidth: () => 250_000_000,
      getUploadBandwidth: () => 82_500_000,
      getUnloadedLatency: () => 21.7,
      getUnloadedJitter: () => 2.4,
      getDownLoadedLatency: () => 75.2,
      getUpLoadedLatency: () => 43.1,
      getTotalDurationMs: () => 18_250,
    } as unknown as Results;

    expect(readNetworkSpeedMetrics(fakeResults)).toEqual({
      downloadBitsPerSecond: 250_000_000,
      uploadBitsPerSecond: 82_500_000,
      idleLatencyMs: 21.7,
      idleJitterMs: 2.4,
      downloadLoadedLatencyMs: 75.2,
      uploadLoadedLatencyMs: 43.1,
      durationMs: 18_250,
    });
  });

  it("handles unavailable or throwing metric getters without crashing", () => {
    const fakeResults = {
      getDownloadBandwidth: () => 0,
      getUploadBandwidth: () => { throw new Error("not measured"); },
      getUnloadedLatency: () => Number.NaN,
      getUnloadedJitter: () => null,
      getDownLoadedLatency: () => undefined,
      getUpLoadedLatency: () => undefined,
      getTotalDurationMs: () => undefined,
    } as unknown as Results;

    expect(readNetworkSpeedMetrics(fakeResults)).toEqual({
      downloadBitsPerSecond: null,
      uploadBitsPerSecond: null,
      idleLatencyMs: null,
      idleJitterMs: null,
      downloadLoadedLatencyMs: null,
      uploadLoadedLatencyMs: null,
      durationMs: null,
    });
  });
});

describe("measured upload speed conversion", () => {
  it("converts measured bit/s to the calculator's Mbps field without display rounding", () => {
    expect(measuredUploadToMbpsInput(82_500_000)).toBe("82.5");
    expect(measuredUploadToMbpsInput(1_234_567)).toBe("1.234567");
  });

  it("rejects zero, negative, or non-finite upload results", () => {
    expect(measuredUploadToMbpsInput(0)).toBeNull();
    expect(measuredUploadToMbpsInput(-1)).toBeNull();
    expect(measuredUploadToMbpsInput(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

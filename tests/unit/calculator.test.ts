import { describe, expect, it } from "vitest";
import {
  calculateMaximumSize,
  calculateRequiredSpeed,
  calculateUploadTime,
} from "../../src/core/calculator";
import { toBitsPerSecond, toBytes } from "../../src/core/units";
import { formatDuration } from "../../src/core/format";

const noLoss = { throughputLossPercent: 0 };

describe("unit conversion", () => {
  it("converts decimal megabytes and gigabytes exactly", () => {
    expect(toBytes(1, "MB")).toBe(1_000_000);
    expect(toBytes(1, "GB")).toBe(1_000_000_000);
  });

  it("keeps IEC units distinct from SI units", () => {
    expect(toBytes(1, "MiB")).toBe(1_048_576);
    expect(toBytes(1, "GiB")).toBe(1_073_741_824);
  });

  it("distinguishes bits from bytes in throughput units", () => {
    expect(toBitsPerSecond(1, "Mbps")).toBe(1_000_000);
    expect(toBitsPerSecond(1, "MBps")).toBe(8_000_000);
  });
});

describe("upload-time calculation", () => {
  it("estimates 1 GB at 10 Mbps as 800 seconds", () => {
    const result = calculateUploadTime({
      fileSizeBytes: 1_000_000_000,
      nominalBitsPerSecond: 10_000_000,
      assumptions: noLoss,
    });
    expect(result.durationSeconds).toBe(800);
    expect(result.effectiveBitsPerSecond).toBe(10_000_000);
  });

  it("estimates 1 GB at 10 MB/s as 100 seconds", () => {
    const result = calculateUploadTime({
      fileSizeBytes: 1_000_000_000,
      nominalBitsPerSecond: 80_000_000,
      assumptions: noLoss,
    });
    expect(result.durationSeconds).toBe(100);
  });

  it("applies a 10 percent throughput reduction once", () => {
    const result = calculateUploadTime({
      fileSizeBytes: 1_000_000_000,
      nominalBitsPerSecond: 10_000_000,
      assumptions: { throughputLossPercent: 10 },
    });
    expect(result.effectiveBitsPerSecond).toBe(9_000_000);
    expect(result.durationSeconds).toBeCloseTo(888.8888889, 6);
  });

  it("returns zero seconds for an empty file", () => {
    const result = calculateUploadTime({
      fileSizeBytes: 0,
      nominalBitsPerSecond: 5_000_000,
      assumptions: noLoss,
    });
    expect(result.durationSeconds).toBe(0);
  });

  it("rejects invalid rates, sizes, and throughput reductions", () => {
    expect(() => calculateUploadTime({ fileSizeBytes: 10, nominalBitsPerSecond: 0, assumptions: noLoss })).toThrow(/greater than zero/i);
    expect(() => calculateUploadTime({ fileSizeBytes: -1, nominalBitsPerSecond: 10, assumptions: noLoss })).toThrow(/negative/i);
    expect(() => calculateUploadTime({ fileSizeBytes: 10, nominalBitsPerSecond: 10, assumptions: { throughputLossPercent: 100 } })).toThrow(/between 0% and 99.9%/i);
  });
});

describe("reverse calculations", () => {
  it("calculates required speed for a 1 GB file in 100 seconds", () => {
    const result = calculateRequiredSpeed({
      fileSizeBytes: 1_000_000_000,
      targetDurationSeconds: 100,
      assumptions: noLoss,
    });
    expect(result.requiredNominalBitsPerSecond).toBe(80_000_000);
  });

  it("calculates maximum size for 100 Mbps over 30 minutes", () => {
    const result = calculateMaximumSize({
      nominalBitsPerSecond: 100_000_000,
      availableDurationSeconds: 1_800,
      assumptions: noLoss,
    });
    expect(result.maximumBytes).toBe(22_500_000_000);
  });

  it("keeps required-speed and maximum-size calculations inverse", () => {
    const fileSizeBytes = 7_654_321_000;
    const targetDurationSeconds = 1_337;
    const loss = { throughputLossPercent: 12.5 };
    const required = calculateRequiredSpeed({ fileSizeBytes, targetDurationSeconds, assumptions: loss });
    const maximum = calculateMaximumSize({
      nominalBitsPerSecond: required.requiredNominalBitsPerSecond,
      availableDurationSeconds: targetDurationSeconds,
      assumptions: loss,
    });
    expect(maximum.maximumBytes).toBeCloseTo(fileSizeBytes, 5);
  });

  it("rejects a zero target time", () => {
    expect(() => calculateRequiredSpeed({ fileSizeBytes: 1, targetDurationSeconds: 0, assumptions: noLoss })).toThrow(/greater than zero/i);
  });
});

describe("duration formatting", () => {
  it("formats seconds and mixed units", () => {
    expect(formatDuration(45)).toBe("45 secs");
    expect(formatDuration(800)).toBe("13 mins 20 secs");
    expect(formatDuration(8_000)).toBe("2 hours 13 mins");  });

  it("handles zero and sub-second values", () => {
    expect(formatDuration(0)).toBe("0 sec");
    expect(formatDuration(0.25)).toBe("Less than 1 sec");
  });
});

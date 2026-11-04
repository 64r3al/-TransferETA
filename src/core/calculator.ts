import {
  MAX_SUPPORTED_BYTES,
  MAX_SUPPORTED_BITS_PER_SECOND,
  MAX_SUPPORTED_DURATION_SECONDS,
  assertFinite,
} from "./units";

export interface TransferAssumptions {
  /** Percentage of nominal throughput unavailable for payload (0–99.9). */
  throughputLossPercent: number;
}

export interface UploadTimeInput {
  fileSizeBytes: number;
  nominalBitsPerSecond: number;
  assumptions: TransferAssumptions;
}

export interface RequiredSpeedInput {
  fileSizeBytes: number;
  targetDurationSeconds: number;
  assumptions: TransferAssumptions;
}

export interface MaximumSizeInput {
  nominalBitsPerSecond: number;
  availableDurationSeconds: number;
  assumptions: TransferAssumptions;
}

export interface UploadTimeResult {
  fileSizeBytes: number;
  nominalBitsPerSecond: number;
  effectiveBitsPerSecond: number;
  throughputLossPercent: number;
  durationSeconds: number;
}

export interface RequiredSpeedResult {
  fileSizeBytes: number;
  targetDurationSeconds: number;
  effectiveBitsPerSecond: number;
  requiredNominalBitsPerSecond: number;
  throughputLossPercent: number;
}

export interface MaximumSizeResult {
  nominalBitsPerSecond: number;
  effectiveBitsPerSecond: number;
  availableDurationSeconds: number;
  maximumBytes: number;
  throughputLossPercent: number;
}

export class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculationError";
  }
}

function validateAssumptions(assumptions: TransferAssumptions): number {
  const loss = assumptions?.throughputLossPercent;
  assertFinite(loss, "Throughput reduction");
  if (loss < 0 || loss > 99.9) {
    throw new CalculationError("Throughput reduction must be between 0% and 99.9%.");
  }
  return loss;
}

function validateFileSize(fileSizeBytes: number): void {
  assertFinite(fileSizeBytes, "File size");
  if (fileSizeBytes < 0) throw new CalculationError("File size cannot be negative.");
  if (fileSizeBytes > MAX_SUPPORTED_BYTES) {
    throw new CalculationError("File size is larger than the supported range.");
  }
}

function validateRate(rate: number): void {
  assertFinite(rate, "Upload speed");
  if (rate <= 0) throw new CalculationError("Upload speed must be greater than zero.");
  if (rate > MAX_SUPPORTED_BITS_PER_SECOND) {
    throw new CalculationError("Upload speed is larger than the supported range.");
  }
}

function validateDuration(duration: number, label: string): void {
  assertFinite(duration, label);
  if (duration <= 0) throw new CalculationError(`${label} must be greater than zero.`);
  if (duration > MAX_SUPPORTED_DURATION_SECONDS) {
    throw new CalculationError(`${label} is larger than the supported range (100 years).`);
  }
}

function effectiveRate(nominalBitsPerSecond: number, lossPercent: number): number {
  const rate = nominalBitsPerSecond * (1 - lossPercent / 100);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new CalculationError("The effective upload speed is outside the supported range.");
  }
  return rate;
}

export function calculateUploadTime(input: UploadTimeInput): UploadTimeResult {
  validateFileSize(input.fileSizeBytes);
  validateRate(input.nominalBitsPerSecond);
  const loss = validateAssumptions(input.assumptions);
  const effectiveBitsPerSecond = effectiveRate(input.nominalBitsPerSecond, loss);
  const durationSeconds = (input.fileSizeBytes * 8) / effectiveBitsPerSecond;
  if (!Number.isFinite(durationSeconds)) {
    throw new CalculationError("This estimate is too large to represent safely.");
  }
  return {
    fileSizeBytes: input.fileSizeBytes,
    nominalBitsPerSecond: input.nominalBitsPerSecond,
    effectiveBitsPerSecond,
    throughputLossPercent: loss,
    durationSeconds,
  };
}

export function calculateRequiredSpeed(input: RequiredSpeedInput): RequiredSpeedResult {
  validateFileSize(input.fileSizeBytes);
  validateDuration(input.targetDurationSeconds, "Target time");
  const loss = validateAssumptions(input.assumptions);
  const effectiveBitsPerSecond = (input.fileSizeBytes * 8) / input.targetDurationSeconds;
  const requiredNominalBitsPerSecond = effectiveBitsPerSecond / (1 - loss / 100);
  if (!Number.isFinite(requiredNominalBitsPerSecond) || requiredNominalBitsPerSecond > MAX_SUPPORTED_BITS_PER_SECOND) {
    throw new CalculationError("The required upload speed is outside the supported range.");
  }
  return {
    fileSizeBytes: input.fileSizeBytes,
    targetDurationSeconds: input.targetDurationSeconds,
    effectiveBitsPerSecond,
    requiredNominalBitsPerSecond,
    throughputLossPercent: loss,
  };
}

export function calculateMaximumSize(input: MaximumSizeInput): MaximumSizeResult {
  validateRate(input.nominalBitsPerSecond);
  validateDuration(input.availableDurationSeconds, "Available time");
  const loss = validateAssumptions(input.assumptions);
  const effectiveBitsPerSecond = effectiveRate(input.nominalBitsPerSecond, loss);
  const maximumBytes = (effectiveBitsPerSecond * input.availableDurationSeconds) / 8;
  if (!Number.isFinite(maximumBytes) || maximumBytes > MAX_SUPPORTED_BYTES) {
    throw new CalculationError("The estimated file size is outside the supported range.");
  }
  return {
    nominalBitsPerSecond: input.nominalBitsPerSecond,
    effectiveBitsPerSecond,
    availableDurationSeconds: input.availableDurationSeconds,
    maximumBytes,
    throughputLossPercent: loss,
  };
}

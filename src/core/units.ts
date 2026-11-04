export type SpeedUnit = "bps" | "Kbps" | "Mbps" | "Gbps" | "Bps" | "KBps" | "MBps" | "GBps";
export type SizeUnit = "B" | "KB" | "MB" | "GB" | "TB" | "KiB" | "MiB" | "GiB" | "TiB";

export interface UnitOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

export const SPEED_UNITS: readonly UnitOption<SpeedUnit>[] = [
  { value: "bps", label: "bit/s", description: "bits per second" },
  { value: "Kbps", label: "Kbit/s", description: "kilobits per second" },
  { value: "Mbps", label: "Mbit/s", description: "megabits per second" },
  { value: "Gbps", label: "Gbit/s", description: "gigabits per second" },
  { value: "Bps", label: "B/s", description: "bytes per second" },
  { value: "KBps", label: "KB/s", description: "kilobytes per second" },
  { value: "MBps", label: "MB/s", description: "megabytes per second" },
  { value: "GBps", label: "GB/s", description: "gigabytes per second" },
] as const;

export const SIZE_UNITS: readonly UnitOption<SizeUnit>[] = [
  { value: "B", label: "Bytes (B)", description: "bytes" },
  { value: "KB", label: "Kilobytes (KB)", description: "1,000 bytes" },
  { value: "MB", label: "Megabytes (MB)", description: "1,000,000 bytes" },
  { value: "GB", label: "Gigabytes (GB)", description: "1,000,000,000 bytes" },
  { value: "TB", label: "Terabytes (TB)", description: "1,000,000,000,000 bytes" },
  { value: "KiB", label: "Kibibytes (KiB)", description: "1,024 bytes" },
  { value: "MiB", label: "Mebibytes (MiB)", description: "1,048,576 bytes" },
  { value: "GiB", label: "Gibibytes (GiB)", description: "1,073,741,824 bytes" },
  { value: "TiB", label: "Tebibytes (TiB)", description: "1,099,511,627,776 bytes" },
] as const;

const DECIMAL = 1_000;
const BINARY = 1_024;

const SPEED_FACTORS: Record<SpeedUnit, number> = {
  bps: 1,
  Kbps: DECIMAL,
  Mbps: DECIMAL ** 2,
  Gbps: DECIMAL ** 3,
  Bps: 8,
  KBps: 8 * DECIMAL,
  MBps: 8 * DECIMAL ** 2,
  GBps: 8 * DECIMAL ** 3,
};

const SIZE_FACTORS: Record<SizeUnit, number> = {
  B: 1,
  KB: DECIMAL,
  MB: DECIMAL ** 2,
  GB: DECIMAL ** 3,
  TB: DECIMAL ** 4,
  KiB: BINARY,
  MiB: BINARY ** 2,
  GiB: BINARY ** 3,
  TiB: BINARY ** 4,
};

export const MAX_SUPPORTED_BYTES = Number.MAX_SAFE_INTEGER;
export const MAX_SUPPORTED_BITS_PER_SECOND = 1e18;
export const MAX_SUPPORTED_DURATION_SECONDS = 100 * 365.25 * 24 * 60 * 60;

export function toBitsPerSecond(value: number, unit: SpeedUnit): number {
  assertFinite(value, "Upload speed");
  if (value <= 0) throw new RangeError("Upload speed must be greater than zero.");
  const converted = value * SPEED_FACTORS[unit];
  if (!Number.isFinite(converted) || converted > MAX_SUPPORTED_BITS_PER_SECOND) {
    throw new RangeError("Upload speed is outside the supported range.");
  }
  return converted;
}

export function toBytes(value: number, unit: SizeUnit): number {
  assertFinite(value, "File size");
  if (value < 0) throw new RangeError("File size cannot be negative.");
  const converted = value * SIZE_FACTORS[unit];
  if (!Number.isFinite(converted) || converted > MAX_SUPPORTED_BYTES) {
    throw new RangeError("File size is larger than the supported range (about 8 PiB).");
  }
  return converted;
}

export function bytesToUnit(bytes: number, unit: SizeUnit): number {
  assertFinite(bytes, "File size");
  if (bytes < 0) throw new RangeError("File size cannot be negative.");
  return bytes / SIZE_FACTORS[unit];
}

export function bitsPerSecondToUnit(rate: number, unit: SpeedUnit): number {
  assertFinite(rate, "Upload speed");
  if (rate < 0) throw new RangeError("Upload speed cannot be negative.");
  return rate / SPEED_FACTORS[unit];
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatRate(bitsPerSecond: number): string {
  assertFinite(bitsPerSecond, "Upload speed");
  const units: Array<{ threshold: number; factor: number; label: string }> = [
    { threshold: 1e9, factor: 1e9, label: "Gbit/s" },
    { threshold: 1e6, factor: 1e6, label: "Mbit/s" },
    { threshold: 1e3, factor: 1e3, label: "Kbit/s" },
  ];
  const selected = units.find((unit) => bitsPerSecond >= unit.threshold);
  if (selected) return `${formatNumber(bitsPerSecond / selected.factor, 2)} ${selected.label}`;
  return `${formatNumber(bitsPerSecond, 2)} bit/s`;
}

export function formatBytes(bytes: number, binary = false): string {
  assertFinite(bytes, "File size");
  if (bytes < 0) throw new RangeError("File size cannot be negative.");
  const base = binary ? BINARY : DECIMAL;
  const units = binary
    ? ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]
    : ["B", "KB", "MB", "GB", "TB", "PB"];
  if (bytes === 0) return "0 B";
  let value = bytes;
  let index = 0;
  while (value >= base && index < units.length - 1) {
    value /= base;
    index += 1;
  }
  return `${formatNumber(value, index === 0 ? 0 : 2)} ${units[index]}`;
}

export function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be a finite number.`);
}

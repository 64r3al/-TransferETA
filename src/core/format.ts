import { formatBytes, formatNumber, formatRate } from "./units";

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  if (totalSeconds === 0) return "0 sec";
  if (totalSeconds < 1) return "Less than 1 sec";

  let remainder = Math.floor(totalSeconds);
  const units: Array<[string, number]> = [
    ["day", 86_400],
    ["hour", 3_600],
    ["min", 60],
    ["sec", 1],
  ];
  const parts: string[] = [];
  for (const [label, seconds] of units) {
    const amount = Math.floor(remainder / seconds);
    if (amount > 0) {
      parts.push(`${formatNumber(amount, 0)} ${label}${amount === 1 ? "" : "s"}`);
      remainder %= seconds;
    }
    if (parts.length === 2) break;
  }
  return parts.join(" ");
}

export function formatDurationClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const seconds = Math.floor(totalSeconds);
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  const clock = [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
  return days > 0 ? `${days}d ${clock}` : clock;
}

export function formatPrimaryRate(rate: number): string {
  return formatRate(rate);
}

export function formatPrimarySize(bytes: number, binary = false): string {
  return formatBytes(bytes, binary);
}

export function formatCompactNumber(value: number, digits = 2): string {
  return formatNumber(value, digits);
}

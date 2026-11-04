import "./styles.css";
import {
  calculateMaximumSize,
  calculateRequiredSpeed,
  calculateUploadTime,
  CalculationError,
  type MaximumSizeResult,
  type RequiredSpeedResult,
  type UploadTimeResult,
} from "./core/calculator";
import { formatDuration, formatDurationClock } from "./core/format";
import type CloudflareSpeedTest from "@cloudflare/speedtest";
import {
  measuredUploadToMbpsInput,
  readNetworkSpeedMetrics,
  SPEED_TEST_CONFIG,
  type NetworkSpeedMetrics,
} from "./core/speed-test";
import {
  formatBytes,
  formatNumber,
  formatRate,
  SIZE_UNITS,
  SPEED_UNITS,
  toBitsPerSecond,
  toBytes,
  type SizeUnit,
  type SpeedUnit,
} from "./core/units";

type CalculatorMode = "upload-time" | "required-speed" | "maximum-size";
type Draft = Record<string, string>;
type CalculationResult =
  | { mode: "upload-time"; data: UploadTimeResult }
  | { mode: "required-speed"; data: RequiredSpeedResult }
  | { mode: "maximum-size"; data: MaximumSizeResult };

type SimulationState = "ready" | "running" | "paused" | "complete";

const DEFAULT_DRAFTS: Record<CalculatorMode, Draft> = {
  "upload-time": { fileSize: "10", fileUnit: "GB", speed: "100", speedUnit: "Mbps" },
  "required-speed": { fileSize: "10", fileUnit: "GB", hours: "0", minutes: "5", seconds: "0" },
  "maximum-size": { speed: "100", speedUnit: "Mbps", hours: "0", minutes: "30", seconds: "0" },
};

const COPY = {
  "upload-time": "Calculate upload time",
  "required-speed": "Calculate required speed",
  "maximum-size": "Calculate maximum file size",
} satisfies Record<CalculatorMode, string>;

const MODE_COPY: Record<CalculatorMode, { title: string; description: string; eyebrow: string }> = {
  "upload-time": {
    title: "What are you uploading?",
    description: "Enter the file size and your available upload speed.",
    eyebrow: "YOUR ESTIMATED UPLOAD TIME",
  },
  "required-speed": {
    title: "Set your deadline.",
    description: "Tell us the file size and when you need the upload finished.",
    eyebrow: "UPLOAD SPEED YOU NEED",
  },
  "maximum-size": {
    title: "How much time do you have?",
    description: "Enter your upload speed and available transfer time.",
    eyebrow: "MAXIMUM TRANSFERABLE SIZE",
  },
};

const fields = document.querySelector<HTMLDivElement>("#fields")!;
const form = document.querySelector<HTMLFormElement>("#calculator-form")!;
const formTitle = document.querySelector<HTMLHeadingElement>("#form-title")!;
const formDescription = document.querySelector<HTMLParagraphElement>("#form-description")!;
const calculateLabel = document.querySelector<HTMLSpanElement>("#calculate-label")!;
const formError = document.querySelector<HTMLParagraphElement>("#form-error")!;
const lossInput = document.querySelector<HTMLInputElement>("#throughput-loss")!;
const lossOutput = document.querySelector<HTMLElement>("#loss-output")!;
const resultEyebrow = document.querySelector<HTMLElement>(".result-eyebrow")!;
const resultValue = document.querySelector<HTMLElement>("#result-value")!;
const resultDescription = document.querySelector<HTMLElement>("#result-description")!;
const metricsGrid = document.querySelector<HTMLElement>("#metrics-grid")!;
const resultContent = document.querySelector<HTMLElement>("#result-content")!;
const simulationCard = document.querySelector<HTMLElement>("#simulation-card")!;
const simulationStateLabel = document.querySelector<HTMLElement>("#simulation-state")!;
const progressPercent = document.querySelector<HTMLElement>("#progress-percent")!;
const progressBar = document.querySelector<HTMLElement>("#progress-bar")!;
const progressFill = document.querySelector<HTMLElement>("#progress-fill")!;
const elapsedTime = document.querySelector<HTMLElement>("#elapsed-time")!;
const remainingTime = document.querySelector<HTMLElement>("#remaining-time")!;
const simulationToggle = document.querySelector<HTMLButtonElement>("#simulation-toggle")!;
const simulationSpeed = document.querySelector<HTMLSelectElement>("#simulation-speed")!;
const comparisonGrid = document.querySelector<HTMLElement>("#comparison-grid")!;
const comparisonCaption = document.querySelector<HTMLElement>("#comparison-caption")!;
const toast = document.querySelector<HTMLElement>("#toast")!;
const speedTestStart = document.querySelector<HTMLButtonElement>("#speed-test-start")!;
const speedTestStartLabel = document.querySelector<HTMLElement>("#speed-test-start-label")!;
const speedTestCancel = document.querySelector<HTMLButtonElement>("#speed-test-cancel")!;
const speedTestStatus = document.querySelector<HTMLElement>("#speed-test-status")!;
const speedTestBadge = document.querySelector<HTMLElement>("#speed-test-badge")!;
const speedTestPhase = document.querySelector<HTMLElement>("#speed-test-phase")!;
const speedTestPhaseCount = document.querySelector<HTMLElement>("#speed-test-phase-count")!;
const speedTestProgress = document.querySelector<HTMLElement>("#speed-test-progress")!;
const speedTestProgressFill = document.querySelector<HTMLElement>("#speed-test-progress-fill")!;
const speedTestUpload = document.querySelector<HTMLElement>("#speed-test-upload")!;
const speedTestDownload = document.querySelector<HTMLElement>("#speed-test-download")!;
const speedTestPing = document.querySelector<HTMLElement>("#speed-test-ping")!;
const speedTestJitter = document.querySelector<HTMLElement>("#speed-test-jitter")!;
const speedTestExtra = document.querySelector<HTMLElement>("#speed-test-extra")!;
const speedTestApply = document.querySelector<HTMLButtonElement>("#speed-test-apply")!;

let mode: CalculatorMode = "upload-time";
let lossPercent = 0;
let lastResult: CalculationResult | null = null;
let lastSummary = "";
let toastTimer: number | undefined;
let simulationFrame: number | undefined;
let simulationState: SimulationState = "ready";
let simulationElapsedBase = 0;
let simulationStartedAt = 0;
let simulationMultiplier = Number(simulationSpeed.value);
let simulationDuration = 0;
let speedTestEngine: InstanceType<typeof CloudflareSpeedTest> | null = null;
let speedTestRunId = 0;
let latestMeasuredUploadBitsPerSecond: number | null = null;
let speedTestHadErrors = false;

const drafts: Record<CalculatorMode, Draft> = {
  "upload-time": { ...DEFAULT_DRAFTS["upload-time"] },
  "required-speed": { ...DEFAULT_DRAFTS["required-speed"] },
  "maximum-size": { ...DEFAULT_DRAFTS["maximum-size"] },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function optionsHtml<T extends string>(items: readonly { value: T; label: string }[], selected: string): string {
  return items.map((item) => `<option value="${item.value}"${item.value === selected ? " selected" : ""}>${item.label}</option>`).join("");
}

function fileSizeField(value: string, unit: string, includePresets = true): string {
  const sizeOptions = SIZE_UNITS.map((item) => ({ value: item.value, label: item.value }));
  return `
    <div class="field">
      <label class="field-label" for="file-size">File size</label>
      <div class="input-combo">
        <input id="file-size" name="fileSize" type="number" min="0" max="9007199254740991" step="any" inputmode="decimal" value="${escapeHtml(value)}" aria-label="File size value" aria-describedby="file-size-help" />
        <select id="file-unit" name="fileUnit" aria-label="File size unit">${optionsHtml(sizeOptions, unit)}</select>
      </div>
      <span class="field-help" id="file-size-help">The total size of the file or transfer.</span>
      ${includePresets ? `<div class="preset-row"><span class="preset-label">Quick pick</span>${[
        ["100", "MB"], ["500", "MB"], ["1", "GB"], ["5", "GB"], ["10", "GB"], ["50", "GB"],
      ].map(([number, unitName]) => `<button class="preset-chip" type="button" data-preset-target="file" data-preset-value="${number}" data-preset-unit="${unitName}">${number} ${unitName}</button>`).join("")}</div>` : ""}
    </div>`;
}

function speedField(value: string, unit: string, includePresets = true): string {
  return `
    <div class="field">
      <label class="field-label" for="speed-value">Upload speed</label>
      <div class="input-combo">
        <input id="speed-value" name="speed" type="number" min="0" step="any" inputmode="decimal" value="${escapeHtml(value)}" aria-label="Upload speed value" aria-describedby="speed-help" />
        <select id="speed-unit" name="speedUnit" aria-label="Upload speed unit">${optionsHtml(SPEED_UNITS.map((item) => ({ value: item.value, label: item.label })), unit)}</select>
      </div>
      <span class="field-help" id="speed-help">Use your plan speed or a measured upload result.</span>
      ${includePresets ? `<div class="preset-row"><span class="preset-label">Quick pick</span>${[
        ["10", "Mbps"], ["25", "Mbps"], ["50", "Mbps"], ["100", "Mbps"], ["500", "Mbps"], ["1", "Gbps"],
      ].map(([number, unitName]) => `<button class="preset-chip" type="button" data-preset-target="speed" data-preset-value="${number}" data-preset-unit="${unitName}">${number} ${unitName}</button>`).join("")}</div>` : ""}
    </div>`;
}

function durationField(hours: string, minutes: string, seconds: string, label: string): string {
  return `
    <div class="field full-width">
      <span class="field-label">${label}</span>
      <div class="time-fields">
        <label class="time-field"><span>Hours</span><input id="target-hours" type="number" min="0" max="876000" step="1" inputmode="numeric" value="${escapeHtml(hours)}" /></label>
        <label class="time-field"><span>Minutes</span><input id="target-minutes" type="number" min="0" max="59" step="1" inputmode="numeric" value="${escapeHtml(minutes)}" /></label>
        <label class="time-field"><span>Seconds</span><input id="target-seconds" type="number" min="0" max="59" step="1" inputmode="numeric" value="${escapeHtml(seconds)}" /></label>
      </div>
      <span class="field-help">Enter the total available time. At least one value must be greater than zero.</span>
      <div class="preset-row"><span class="preset-label">Quick pick</span>${[
        ["0", "5", "0", "5 min"], ["0", "15", "0", "15 min"], ["0", "30", "0", "30 min"], ["1", "0", "0", "1 hour"], ["2", "0", "0", "2 hours"],
      ].map(([h, m, s, labelText]) => `<button class="preset-chip" type="button" data-preset-target="duration" data-hours="${h}" data-minutes="${m}" data-seconds="${s}">${labelText}</button>`).join("")}</div>
    </div>`;
}

function renderFields(): void {
  const draft = drafts[mode];
  const fileSize = draft.fileSize ?? "10";
  const fileUnit = draft.fileUnit ?? "GB";
  const speed = draft.speed ?? "100";
  const speedUnit = draft.speedUnit ?? "Mbps";
  const hours = draft.hours ?? "0";
  const minutes = draft.minutes ?? (mode === "required-speed" ? "5" : "30");
  const seconds = draft.seconds ?? "0";

  if (mode === "upload-time") {
    fields.innerHTML = `${fileSizeField(fileSize, fileUnit)}${speedField(speed, speedUnit)}`;
  } else if (mode === "required-speed") {
    fields.innerHTML = `${fileSizeField(fileSize, fileUnit, false)}${durationField(hours, minutes, seconds, "Finish within")}`;
  } else {
    fields.innerHTML = `${speedField(speed, speedUnit, false)}${durationField(hours, minutes, seconds, "Available transfer time")}`;
  }
  formTitle.textContent = MODE_COPY[mode].title;
  formDescription.textContent = MODE_COPY[mode].description;
  calculateLabel.textContent = COPY[mode];
  resultEyebrow.textContent = MODE_COPY[mode].eyebrow;
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
  simulationCard.hidden = mode !== "upload-time";
  hideError();
  updateLossControl();
}

function captureDraft(): void {
  const next: Draft = { ...drafts[mode] };
  const fieldMap: Record<string, string> = {
    fileSize: "file-size",
    fileUnit: "file-unit",
    speed: "speed-value",
    speedUnit: "speed-unit",
    hours: "target-hours",
    minutes: "target-minutes",
    seconds: "target-seconds",
  };
  for (const [key, id] of Object.entries(fieldMap)) {
    const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (element) next[key] = element.value;
  }
  drafts[mode] = next;
}

function updateLossControl(): void {
  lossInput.value = String(lossPercent);
  lossOutput.textContent = `${formatNumber(lossPercent, 1)}%`;
  lossInput.style.setProperty("--range-progress", `${(lossPercent / 99.9) * 100}%`);
}

function readNumber(id: string, label: string, allowZero: boolean): number {
  const element = document.getElementById(id) as HTMLInputElement | null;
  if (!element || element.value.trim() === "") throw new CalculationError(`Enter ${label.toLowerCase()}.`);
  const value = Number(element.value);
  if (!Number.isFinite(value)) throw new CalculationError(`${label} must be a valid number.`);
  if (allowZero ? value < 0 : value <= 0) {
    throw new CalculationError(allowZero ? `${label} cannot be negative.` : `${label} must be greater than zero.`);
  }
  return value;
}

function readDuration(): number {
  const hours = readNumber("target-hours", "Hours", true);
  const minutes = readNumber("target-minutes", "Minutes", true);
  const seconds = readNumber("target-seconds", "Seconds", true);
  if (hours % 1 !== 0 || minutes % 1 !== 0 || seconds % 1 !== 0) {
    throw new CalculationError("Hours, minutes, and seconds must be whole numbers.");
  }
  if (minutes > 59 || seconds > 59) {
    throw new CalculationError("Minutes and seconds must be between 0 and 59.");
  }
  const total = hours * 3_600 + minutes * 60 + seconds;
  if (total <= 0) throw new CalculationError("Enter a target time greater than zero.");
  if (!Number.isFinite(total) || total > 100 * 365.25 * 24 * 60 * 60) {
    throw new CalculationError("The time is larger than the supported range (100 years).");
  }
  return total;
}

function readFileSize(): number {
  const value = readNumber("file-size", "File size", true);
  const unit = (document.getElementById("file-unit") as HTMLSelectElement).value as SizeUnit;
  return toBytes(value, unit);
}

function readSpeed(): number {
  const value = readNumber("speed-value", "Upload speed", false);
  const unit = (document.getElementById("speed-unit") as HTMLSelectElement).value as SpeedUnit;
  return toBitsPerSecond(value, unit);
}

function showError(message: string): void {
  formError.textContent = message;
  formError.hidden = false;
}

function hideError(): void {
  formError.hidden = true;
  formError.textContent = "";
}

function visualDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 1) return `&lt;1<span>s</span>`;
  const roundedSeconds = Math.round(seconds);
  if (seconds < 60 && roundedSeconds < 60) {
    return `${formatNumber(seconds, 1)}<span>s</span>`;
  }
  let remaining = roundedSeconds;
  const parts: Array<{ value: number; unit: string }> = [];
  for (const [unit, amount] of [["d", 86_400], ["h", 3_600], ["m", 60], ["s", 1]] as const) {
    const value = Math.floor(remaining / amount);
    if (value > 0) {
      parts.push({ value, unit });
      remaining %= amount;
    }
    if (parts.length === 2) break;
  }
  return parts.map((part) => `${formatNumber(part.value, 0)}<span>${part.unit}</span>`).join(" ");
}

function resultMetric(label: string, value: string): string {
  const wrapper = document.createElement("div");
  wrapper.className = "metric-cell";
  const title = document.createElement("span");
  title.textContent = label;
  const content = document.createElement("strong");
  content.textContent = value;
  wrapper.append(title, content);
  return wrapper.outerHTML;
}

function currentLossText(): string {
  return `${formatNumber(lossPercent, 1)}%`;
}

function runCalculation(): void {
  captureDraft();
  hideError();
  try {
    let calculated: CalculationResult;
    if (mode === "upload-time") {
      calculated = {
        mode,
        data: calculateUploadTime({
          fileSizeBytes: readFileSize(),
          nominalBitsPerSecond: readSpeed(),
          assumptions: { throughputLossPercent: lossPercent },
        }),
      };
    } else if (mode === "required-speed") {
      calculated = {
        mode,
        data: calculateRequiredSpeed({
          fileSizeBytes: readFileSize(),
          targetDurationSeconds: readDuration(),
          assumptions: { throughputLossPercent: lossPercent },
        }),
      };
    } else {
      calculated = {
        mode,
        data: calculateMaximumSize({
          nominalBitsPerSecond: readSpeed(),
          availableDurationSeconds: readDuration(),
          assumptions: { throughputLossPercent: lossPercent },
        }),
      };
    }
    lastResult = calculated;
    renderResult(calculated);
    renderComparison(calculated);
    if (calculated.mode === "upload-time") resetSimulation(calculated.data.durationSeconds);
    else resetSimulation(0);
  } catch (error) {
    lastResult = null;
    lastSummary = "";
    resultValue.textContent = "—";
    resultDescription.textContent = "Correct the input above to calculate a new estimate.";
    metricsGrid.innerHTML = "";
    resetSimulation(0);
    const message = error instanceof Error ? error.message : "Something went wrong. Check your inputs and try again.";
    showError(message);
  }
}

function renderResult(result: CalculationResult): void {
  let primaryValue = "—";
  let description = "";
  let metrics: string[] = [];
  if (result.mode === "upload-time") {
    const data = result.data;
    primaryValue = visualDuration(data.durationSeconds);
    description = `Estimated time for ${formatBytes(data.fileSizeBytes)} at ${formatRate(data.nominalBitsPerSecond)}.`;
    metrics = [
      resultMetric("File size", formatBytes(data.fileSizeBytes)),
      resultMetric("Upload speed", formatRate(data.nominalBitsPerSecond)),
      resultMetric("Effective speed", formatRate(data.effectiveBitsPerSecond)),
      resultMetric("Speed reduction", `${formatNumber(data.throughputLossPercent, 1)}%`),
    ];
    lastSummary = [
      "TransferETA upload estimate",
      `Estimated time: ${formatDuration(data.durationSeconds)}`,
      `File size: ${formatBytes(data.fileSizeBytes)}`,
      `Upload speed: ${formatRate(data.nominalBitsPerSecond)}`,
      `Effective speed: ${formatRate(data.effectiveBitsPerSecond)}`,
      `Throughput reduction: ${formatNumber(data.throughputLossPercent, 1)}%`,
      "Estimate only; actual transfer times vary.",
    ].join("\n");
  } else if (result.mode === "required-speed") {
    const data = result.data;
    const rate = formatRate(data.requiredNominalBitsPerSecond);
    const [rateNumber, ...rateUnit] = rate.split(" ");
    primaryValue = `<span class="rate-main">${rateNumber ?? "—"}</span><span class="rate-unit"> ${rateUnit.join(" ")}</span>`;
    description = `Nominal upload speed needed to transfer ${formatBytes(data.fileSizeBytes)} in ${formatDuration(data.targetDurationSeconds)}.`;
    metrics = [
      resultMetric("File size", formatBytes(data.fileSizeBytes)),
      resultMetric("Target time", formatDuration(data.targetDurationSeconds)),
      resultMetric("Effective speed", formatRate(data.effectiveBitsPerSecond)),
      resultMetric("Speed reduction", `${formatNumber(data.throughputLossPercent, 1)}%`),
    ];
    lastSummary = [
      "TransferETA required-speed estimate",
      `Required nominal upload speed: ${rate}`,
      `File size: ${formatBytes(data.fileSizeBytes)}`,
      `Target time: ${formatDuration(data.targetDurationSeconds)}`,
      `Required effective speed: ${formatRate(data.effectiveBitsPerSecond)}`,
      `Throughput reduction: ${formatNumber(data.throughputLossPercent, 1)}%`,
    ].join("\n");
  } else {
    const data = result.data;
    primaryValue = `<span class="rate-main">${formatBytes(data.maximumBytes)}</span>`;
    description = `Estimated data capacity in ${formatDuration(data.availableDurationSeconds)} at ${formatRate(data.nominalBitsPerSecond)}.`;
    metrics = [
      resultMetric("Available time", formatDuration(data.availableDurationSeconds)),
      resultMetric("Upload speed", formatRate(data.nominalBitsPerSecond)),
      resultMetric("Effective speed", formatRate(data.effectiveBitsPerSecond)),
      resultMetric("Speed reduction", `${formatNumber(data.throughputLossPercent, 1)}%`),
    ];
    lastSummary = [
      "TransferETA maximum-size estimate",
      `Maximum transferable size: ${formatBytes(data.maximumBytes)}`,
      `Available time: ${formatDuration(data.availableDurationSeconds)}`,
      `Upload speed: ${formatRate(data.nominalBitsPerSecond)}`,
      `Effective speed: ${formatRate(data.effectiveBitsPerSecond)}`,
      `Throughput reduction: ${formatNumber(data.throughputLossPercent, 1)}%`,
    ].join("\n");
  }
  resultValue.innerHTML = primaryValue;
  resultDescription.textContent = description;
  metricsGrid.innerHTML = metrics.join("");
  resultContent.dataset.mode = result.mode;
}

function renderComparison(result: CalculationResult): void {
  const rates = [25, 50, 100, 500].map((value) => value * 1_000_000);
  let currentSpeed: number | null = null;
  let currentFileSize: number | null = null;
  let availableDuration: number | null = null;
  if (result.mode === "upload-time") {
    currentSpeed = result.data.nominalBitsPerSecond;
    currentFileSize = result.data.fileSizeBytes;
  } else if (result.mode === "required-speed") {
    currentFileSize = result.data.fileSizeBytes;
    currentSpeed = result.data.requiredNominalBitsPerSecond;
  } else {
    currentSpeed = result.data.nominalBitsPerSecond;
    availableDuration = result.data.availableDurationSeconds;
  }
  const cards = rates.map((rate) => {
    const isCurrent = currentSpeed !== null && Math.abs(currentSpeed - rate) / rate < .001;
    let value: string;
    let label: string;
    if (availableDuration !== null) {
      const bytes = (rate * (1 - lossPercent / 100) * availableDuration) / 8;
      value = formatBytes(bytes);
      label = "transferable";
    } else {
      const seconds = currentFileSize === null ? 0 : (currentFileSize * 8) / (rate * (1 - lossPercent / 100));
      value = formatDuration(seconds);
      label = "upload time";
    }
    return `<div class="comparison-item${isCurrent ? " is-current" : ""}"><span>${formatRate(rate)}${isCurrent ? " <em>Current</em>" : ""}</span><strong>${value}</strong><small class="comparison-sub-label">${label}</small><i></i></div>`;
  });
  comparisonGrid.innerHTML = cards.join("");
  comparisonCaption.textContent = availableDuration !== null
    ? `Estimated maximum file size across different upload speeds, using your ${formatDuration(availableDuration)} time window and ${currentLossText()} throughput reduction.`
    : `Estimated time for the same ${formatBytes(currentFileSize ?? 0)} file at different speeds, using ${currentLossText()} throughput reduction.`;
}

function buildShareUrl(result: CalculationResult): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("mode", result.mode);
  url.searchParams.set("loss", String(result.data.throughputLossPercent));
  const draft = drafts[result.mode];
  for (const [key, value] of Object.entries(draft)) {
    if (value !== "") url.searchParams.set(key, value);
  }
  return url.toString();
}

function loadFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const requestedMode = params.get("mode");
  if (requestedMode === "upload-time" || requestedMode === "required-speed" || requestedMode === "maximum-size") mode = requestedMode;
  const rawLoss = params.get("loss");
  if (rawLoss !== null) {
    const parsed = Number(rawLoss);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 99.9) lossPercent = parsed;
  }
  const allowedKeys = ["fileSize", "fileUnit", "speed", "speedUnit", "hours", "minutes", "seconds"];
  for (const key of allowedKeys) {
    const value = params.get(key);
    if (value === null || value.length > 30) continue;
    if (key === "fileUnit" && !SIZE_UNITS.some((item) => item.value === value)) continue;
    if (key === "speedUnit" && !SPEED_UNITS.some((item) => item.value === value)) continue;
    if (key !== "fileUnit" && key !== "speedUnit" && value.trim() !== "" && !Number.isFinite(Number(value))) continue;
    drafts[mode][key] = value;
  }
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to the local fallback below.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.setAttribute("readonly", "");
  document.body.append(textarea);  textarea.select();
  let copied = false;
  try { copied = document.execCommand("copy"); } catch { copied = false; }
  textarea.remove();
  return copied;
}

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (toastTimer !== undefined) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function setSpeedTestStatus(message: string, state: "ready" | "running" | "complete" | "warning" | "cancelled"): void {
  speedTestStatus.textContent = message;
  speedTestBadge.dataset.state = state;
  const labels = { ready: "READY", running: "TESTING", complete: "COMPLETE", warning: "PARTIAL", cancelled: "STOPPED" };
  speedTestBadge.innerHTML = `<i></i> ${labels[state]}`;
}

function formatSpeedTestBandwidth(bitsPerSecond: number | null): string {
  return bitsPerSecond !== null && bitsPerSecond > 0
    ? formatNumber(bitsPerSecond / 1_000_000, 2)
    : "—";
}

function formatSpeedTestLatency(milliseconds: number | null): string {
  return milliseconds !== null && milliseconds >= 0
    ? formatNumber(milliseconds, 1)
    : "—";
}

function renderSpeedTestMetrics(metrics: NetworkSpeedMetrics, allowApply: boolean): void {
  speedTestUpload.textContent = formatSpeedTestBandwidth(metrics.uploadBitsPerSecond);
  speedTestDownload.textContent = formatSpeedTestBandwidth(metrics.downloadBitsPerSecond);
  speedTestPing.textContent = formatSpeedTestLatency(metrics.idleLatencyMs);
  speedTestJitter.textContent = formatSpeedTestLatency(metrics.idleJitterMs);
  const loaded: string[] = [];
  if (metrics.uploadLoadedLatencyMs !== null) loaded.push(`Upload latency under load: ${formatNumber(metrics.uploadLoadedLatencyMs, 1)} ms`);
  if (metrics.downloadLoadedLatencyMs !== null) loaded.push(`Download latency under load: ${formatNumber(metrics.downloadLoadedLatencyMs, 1)} ms`);
  if (metrics.durationMs !== null) loaded.push(`Test duration: ${formatNumber(metrics.durationMs / 1_000, 1)} sec`);
  speedTestExtra.textContent = loaded.length > 0 ? loaded.join(" · ") : "Latency and throughput measurements will appear here.";
  latestMeasuredUploadBitsPerSecond = allowApply && metrics.uploadBitsPerSecond !== null && metrics.uploadBitsPerSecond > 0
    ? metrics.uploadBitsPerSecond
    : null;
  speedTestApply.disabled = latestMeasuredUploadBitsPerSecond === null;
}

function setSpeedTestPhase(index: number, type: string): void {
  const count = SPEED_TEST_CONFIG.measurements?.length ?? 0;
  const current = Math.min(index + 1, count);
  const label = type === "latency"
    ? "Measuring latency"
    : type === "download"
      ? "Measuring download throughput"
      : type === "upload"
        ? "Measuring upload throughput"
        : "Checking connection";
  speedTestPhase.textContent = label;
  speedTestPhaseCount.textContent = `${current} / ${count} phases`;
  speedTestProgress.setAttribute("aria-valuemax", String(count));
  speedTestProgress.setAttribute("aria-valuenow", String(current));
  speedTestProgressFill.style.width = `${count > 0 ? (current / count) * 100 : 0}%`;
}

async function startSpeedTest(): Promise<void> {
  if (speedTestEngine?.isRunning) return;
  const runId = ++speedTestRunId;
  speedTestHadErrors = false;
  latestMeasuredUploadBitsPerSecond = null;
  speedTestApply.disabled = true;
  speedTestUpload.textContent = "—";
  speedTestDownload.textContent = "—";
  speedTestPing.textContent = "—";
  speedTestJitter.textContent = "—";
  speedTestExtra.textContent = "Preparing a test against Cloudflare's edge network…";
  speedTestPhase.textContent = "Loading measurement engine";
  speedTestPhaseCount.textContent = `0 / ${SPEED_TEST_CONFIG.measurements?.length ?? 0} phases`;
  speedTestProgress.setAttribute("aria-valuenow", "0");
  speedTestProgressFill.style.width = "0%";
  speedTestStart.disabled = true;
  speedTestStartLabel.textContent = "Preparing test…";
  speedTestCancel.hidden = false;
  setSpeedTestStatus("Starting your speed test. Keep this tab open while measurements run.", "running");

  try {
    // Load the measurement engine only after the visitor explicitly opts in.
    const { default: CloudflareSpeedTestConstructor } = await import("@cloudflare/speedtest");
    if (runId !== speedTestRunId) return;
    const engine = new CloudflareSpeedTestConstructor(SPEED_TEST_CONFIG);
    speedTestEngine = engine;

    engine.onPhaseChange = ({ measurementId, measurement }) => {
      if (runId !== speedTestRunId) return;
      setSpeedTestPhase(measurementId, measurement.type);
    };

    engine.onResultsChange = () => {
      if (runId !== speedTestRunId) return;
      renderSpeedTestMetrics(readNetworkSpeedMetrics(engine.results), false);
    };

    engine.onError = (_message, status) => {
      if (runId !== speedTestRunId) return;
      speedTestHadErrors = true;
      const detail = status ? ` (HTTP ${status})` : "";
      speedTestExtra.textContent = `Some measurements could not complete${detail}. The test will use any valid results it has collected.`;
    };

    engine.onRunningChange = (running) => {
      if (runId !== speedTestRunId) return;
      if (running) {
        speedTestStartLabel.textContent = "Testing connection…";
        speedTestStart.disabled = true;
        speedTestCancel.hidden = false;
      }
    };

    engine.onFinish = (results) => {
      if (runId !== speedTestRunId) return;
      speedTestEngine = null;
      const metrics = readNetworkSpeedMetrics(results);
      renderSpeedTestMetrics(metrics, true);
      speedTestStart.disabled = false;
      speedTestStartLabel.textContent = "Run test again";
      speedTestCancel.hidden = true;
      speedTestProgress.setAttribute("aria-valuenow", String(SPEED_TEST_CONFIG.measurements?.length ?? 8));
      speedTestProgressFill.style.width = "100%";
      speedTestPhase.textContent = "Measurements finished";
      speedTestPhaseCount.textContent = `${SPEED_TEST_CONFIG.measurements?.length ?? 8} / ${SPEED_TEST_CONFIG.measurements?.length ?? 8} phases`;

      if (metrics.uploadBitsPerSecond !== null && metrics.uploadBitsPerSecond > 0) {
        setSpeedTestStatus(
          speedTestHadErrors ? "Test finished with partial measurements. Your measured upload speed is available below." : "Speed test complete. Your measured upload speed is ready to use.",
          speedTestHadErrors ? "warning" : "complete",
        );
      } else {
        setSpeedTestStatus("The upload measurement was unavailable. You can retry, or enter an upload speed manually.", "warning");
        speedTestExtra.textContent = "The connection or browser may have blocked the upload test. No upload speed was applied.";
      }
    };

    engine.play();
  } catch {
    if (runId !== speedTestRunId) return;
    speedTestEngine = null;
    speedTestStart.disabled = false;
    speedTestStartLabel.textContent = "Try speed test again";
    speedTestCancel.hidden = true;
    setSpeedTestStatus("The speed-test engine could not start. Check your connection and try again.", "warning");
    speedTestExtra.textContent = "The measurement package could not be loaded. The manual calculator remains available.";
  }
}

function cancelSpeedTest(): void {
  // Also allow cancellation while the lazy-loaded engine is still downloading.
  if (!speedTestEngine && !speedTestStart.disabled) return;
  speedTestRunId += 1;
  speedTestEngine?.pause();
  speedTestEngine = null;
  speedTestStart.disabled = false;
  speedTestStartLabel.textContent = "Run speed test again";
  speedTestCancel.hidden = true;
  speedTestApply.disabled = true;
  latestMeasuredUploadBitsPerSecond = null;
  speedTestPhase.textContent = "Test stopped";
  speedTestProgress.setAttribute("aria-valuenow", "0");
  speedTestProgressFill.style.width = "0%";
  setSpeedTestStatus("Test stopped. No result was applied to the calculator.", "cancelled");
}

function applyMeasuredUploadSpeed(): void {
  if (latestMeasuredUploadBitsPerSecond === null) return;
  const speedValue = measuredUploadToMbpsInput(latestMeasuredUploadBitsPerSecond);
  if (speedValue === null) {
    showToast("The measured upload speed is outside the supported range.");
    return;
  }
  drafts["upload-time"] = {
    ...drafts["upload-time"],
    speed: speedValue,
    speedUnit: "Mbps",
  };
  mode = "upload-time";
  lossPercent = 0;
  renderFields();
  runCalculation();
  document.querySelector<HTMLElement>("#calculator")?.scrollIntoView({
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
  showToast("Measured upload speed applied. Extra throughput reduction is set to 0% to avoid double-counting.");
}

function setTheme(theme: "light" | "dark", persist = true): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0d1424" : "#f5f7fc");
  const button = document.querySelector<HTMLButtonElement>("#theme-toggle")!;
  button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  if (persist) {
    try { localStorage.setItem("transfereta-theme", theme); } catch { /* Storage may be unavailable in private contexts. */ }
  }
}

function initializeTheme(): void {
  let saved: string | null = null;
  try { saved = localStorage.getItem("transfereta-theme"); } catch { /* Use system preference. */ }
  const theme = saved === "light" || saved === "dark"
    ? saved
    : window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(theme, false);
}

function getSimulationElapsed(now = performance.now()): number {
  if (simulationState !== "running") return simulationElapsedBase;
  return simulationElapsedBase + ((now - simulationStartedAt) / 1_000) * simulationMultiplier;
}

function renderSimulation(elapsed: number): void {
  const progress = simulationDuration <= 0 ? 0 : Math.min(100, (elapsed / simulationDuration) * 100);
  progressFill.style.width = `${progress}%`;
  progressPercent.textContent = `${Math.floor(progress)}%`;
  progressBar.setAttribute("aria-valuenow", String(Math.floor(progress)));
  elapsedTime.textContent = formatDurationClock(Math.min(elapsed, simulationDuration));
  remainingTime.textContent = formatDurationClock(Math.max(0, simulationDuration - elapsed), "ceil");
}

function updateSimulationButton(): void {
  if (simulationState === "running") {
    simulationToggle.innerHTML = "<span>Ⅱ</span> Pause preview";
    simulationStateLabel.textContent = "Preview in progress";
  } else if (simulationState === "paused") {
    simulationToggle.innerHTML = "<span>▶</span> Resume preview";
    simulationStateLabel.textContent = "Preview paused";
  } else if (simulationState === "complete") {
    simulationToggle.innerHTML = "<span>↻</span> Run again";
    simulationStateLabel.textContent = "Preview complete";
  } else {
    simulationToggle.innerHTML = "<span>▶</span> Start preview";
    simulationStateLabel.textContent = "Ready to preview";
  }
}

function stopSimulationFrame(): void {
  if (simulationFrame !== undefined) {
    window.cancelAnimationFrame(simulationFrame);
    simulationFrame = undefined;
  }
}

function tickSimulation(now: number): void {
  if (simulationState !== "running") return;
  const elapsed = getSimulationElapsed(now);
  if (elapsed >= simulationDuration) {
    simulationElapsedBase = simulationDuration;
    simulationState = "complete";
    stopSimulationFrame();
    renderSimulation(simulationDuration);
    updateSimulationButton();
    return;
  }
  renderSimulation(elapsed);
  simulationFrame = window.requestAnimationFrame(tickSimulation);
}

function resetSimulation(duration: number): void {
  stopSimulationFrame();
  simulationDuration = duration;
  simulationState = "ready";
  simulationElapsedBase = 0;
  simulationStartedAt = 0;
  simulationMultiplier = Number(simulationSpeed.value);
  renderSimulation(0);
  updateSimulationButton();
  if (duration === 0) {
    simulationStateLabel.textContent = "Nothing to transfer";
    simulationToggle.disabled = true;
  } else {
    simulationToggle.disabled = false;
  }
}

function toggleSimulation(): void {
  if (!lastResult || lastResult.mode !== "upload-time" || simulationDuration <= 0) return;
  if (simulationState === "running") {
    simulationElapsedBase = getSimulationElapsed();
    simulationState = "paused";
    stopSimulationFrame();
    renderSimulation(simulationElapsedBase);
    updateSimulationButton();
    return;
  }
  if (simulationState === "complete") simulationElapsedBase = 0;
  simulationMultiplier = Number(simulationSpeed.value);
  simulationStartedAt = performance.now();
  simulationState = "running";
  updateSimulationButton();
  simulationFrame = window.requestAnimationFrame(tickSimulation);
}

function resetCurrentForm(): void {
  drafts[mode] = { ...DEFAULT_DRAFTS[mode] };
  lossPercent = 0;
  renderFields();
  runCalculation();
  showToast("Inputs reset to the example values.");
}

function selectPreset(button: HTMLButtonElement): void {
  const target = button.dataset.presetTarget;
  if (target === "file") {
    const value = document.querySelector<HTMLInputElement>("#file-size");
    const unit = document.querySelector<HTMLSelectElement>("#file-unit");
    if (value && unit) {
      value.value = button.dataset.presetValue ?? "";
      unit.value = button.dataset.presetUnit ?? "GB";
      value.dispatchEvent(new Event("input", { bubbles: true }));
      button.parentElement?.querySelectorAll(".preset-chip").forEach((chip) => chip.classList.remove("is-selected"));
      button.classList.add("is-selected");
    }
  } else if (target === "speed") {
    const value = document.querySelector<HTMLInputElement>("#speed-value");
    const unit = document.querySelector<HTMLSelectElement>("#speed-unit");
    if (value && unit) {
      value.value = button.dataset.presetValue ?? "";
      unit.value = button.dataset.presetUnit ?? "Mbps";
      value.dispatchEvent(new Event("input", { bubbles: true }));
      button.parentElement?.querySelectorAll(".preset-chip").forEach((chip) => chip.classList.remove("is-selected"));
      button.classList.add("is-selected");
    }
  } else if (target === "duration") {
    const ids = ["target-hours", "target-minutes", "target-seconds"];
    const values = [button.dataset.hours, button.dataset.minutes, button.dataset.seconds];
    ids.forEach((id, index) => {
      const element = document.getElementById(id) as HTMLInputElement | null;
      if (element) element.value = values[index] ?? "0";
    });
    button.parentElement?.querySelectorAll(".preset-chip").forEach((chip) => chip.classList.remove("is-selected"));
    button.classList.add("is-selected");
  }
}

// Mode navigation: arrow keys move between the three tabs.
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button, index, buttons) => {
  button.addEventListener("click", () => {
    captureDraft();
    mode = button.dataset.mode as CalculatorMode;
    renderFields();
    runCalculation();
  });
  button.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = buttons[(index + offset + buttons.length) % buttons.length];
    next?.click();
    next?.focus();
  });
});

fields.addEventListener("click", (event) => {
  const target = event.target;
  if (target instanceof HTMLButtonElement && target.classList.contains("preset-chip")) selectPreset(target);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runCalculation();
});

lossInput.addEventListener("input", () => {
  lossPercent = Number(lossInput.value);
  updateLossControl();
  captureDraft();
});

lossInput.addEventListener("change", () => {
  if (lastResult) runCalculation();
});

speedTestStart.addEventListener("click", () => { void startSpeedTest(); });
speedTestCancel.addEventListener("click", cancelSpeedTest);
speedTestApply.addEventListener("click", applyMeasuredUploadSpeed);

document.querySelector<HTMLButtonElement>("#reset-button")!.addEventListener("click", resetCurrentForm);
document.querySelector<HTMLButtonElement>("#theme-toggle")!.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  setTheme(current === "dark" ? "light" : "dark");
});
simulationToggle.addEventListener("click", toggleSimulation);
document.querySelector<HTMLButtonElement>("#simulation-reset")!.addEventListener("click", () => resetSimulation(simulationDuration));
simulationSpeed.addEventListener("change", () => {
  if (simulationState === "running") {
    simulationElapsedBase = getSimulationElapsed();
    simulationStartedAt = performance.now();
  }
  simulationMultiplier = Number(simulationSpeed.value);
});

document.querySelector<HTMLButtonElement>("#copy-result")!.addEventListener("click", async () => {
  if (!lastSummary) return;
  const success = await copyText(lastSummary);
  showToast(success ? "Estimate copied to clipboard." : "Could not copy automatically. Please select the result text.");
});

document.querySelector<HTMLButtonElement>("#share-result")!.addEventListener("click", async () => {
  if (!lastResult) return;
  const shareUrl = buildShareUrl(lastResult);
  if (navigator.share) {
    try {
      await navigator.share({ title: "TransferETA estimate", text: lastSummary, url: shareUrl });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  const success = await copyText(shareUrl);
  showToast(success ? "Shareable estimate link copied." : "Could not copy the estimate link.");
});

window.addEventListener("beforeunload", () => {
  stopSimulationFrame();
  speedTestRunId += 1;
  speedTestEngine?.pause();
  speedTestEngine = null;
});

initializeTheme();
loadFromUrl();
renderFields();
runCalculation();
document.querySelector<HTMLElement>("#current-year")!.textContent = String(new Date().getFullYear());

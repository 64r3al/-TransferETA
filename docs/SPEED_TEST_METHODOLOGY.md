# Network Speed Test Methodology

## 1. Purpose

TransferETA includes an optional browser-based network test so a visitor can measure the current upload connection and reuse the measured upload speed in the upload-time calculator. It is a route-specific snapshot, not an ISP certification or a guarantee of future throughput.

## 2. Measurement provider

The implementation uses Cloudflare's official [`@cloudflare/speedtest`](https://github.com/cloudflare/speedtest) JavaScript module. It measures against Cloudflare's edge network and uses the browser Performance Resource Timing API to extract throughput and latency results.

This is not a homemade `fetch()` timer or a measurement against a TransferETA server. It measures the route between this device/browser and the Cloudflare edge selected by network routing. Another provider, destination, browser, or time of day can produce different results.

## 3. Explicit opt-in and data flow

1. The speed-test code is dynamically imported only after the visitor presses **Start speed test**.
2. The browser performs latency, download, and upload measurements against Cloudflare's public speed-test endpoints.
3. TransferETA reads individual bandwidth points, derives the median point estimate, and reports the p10–p90 spread as a sample-consistency signal.
4. Measurements remain in page memory. TransferETA does not send them to its own server or persist a speed-test history.
5. The visitor must press **Use measured upload speed** to copy the upload median into the calculator.

The application explicitly sets both `logAimApiUrl` and `logMeasurementApiUrl` to `null`, disabling the module's optional final-result and per-measurement logging endpoints. The measurement requests themselves still go to Cloudflare. Cloudflare receives normal network request metadata, which can include the visitor IP address, request timing, and the volume of test traffic. The interface discloses this before a run begins. Visitors should review Cloudflare's privacy information and terms before opting in.

No credentials/cookies are sent (`includeCredentials: false`). No packet-loss/TURN measurement is enabled because that optional measurement requires separate TURN server configuration and credentials.

## 4. Enhanced bounded measurement plan

The plan collects 25 idle-latency probes (5 initial + 20 follow-up) and requests up to 10 bandwidth samples in each direction across three payload sizes.

| Direction / measurement | Payload plan | Maximum payload |
|---|---:|---:|
| Initial latency | 5 packets | 0 file payload |
| Warm-up download | 100 KB × 1 | 0.1 MB |
| Follow-up latency | 20 packets | 0 file payload |
| Download ramp | 1 MB × 5, 5 MB × 3, 10 MB × 2 | 40 MB |
| Upload ramp | 1 MB × 5, 5 MB × 3, 10 MB × 2 | 40 MB |
| **Total configured payload ceiling** |  | **80.1 MB** |

These are request ceilings, not a promise that every request will run. Cloudflare's ramp-up logic can stop a direction before larger payloads, and the engine filters samples whose browser-timing duration is below its minimum threshold. The total payload budget does not include every HTTP header, TLS, or protocol byte.

The test has a 12-second per-request abort threshold and a 65-second overall runtime cap. The visitor can stop a run earlier. More sample requests help identify outliers and variable results, but they do not make a browser test perfectly repeatable.

## 5. Result semantics and consistency

- **Upload / download:** median (50th percentile) of valid browser POST / GET throughput samples, in bits per second.
- **Sample chart:** plots each available request sample in completion order, separately for upload and download.
- **p10–p90 spread:** the 10th-to-90th percentile range divided by the median, shown as a percentage. It is a descriptive consistency signal, not a formal confidence interval or quality score.
- **Ping:** median idle latency in milliseconds, when valid latency samples exist.
- **Jitter:** Cloudflare's idle-latency variation calculation, when sufficient samples exist.
- **Loaded latency / jitter:** latency and jitter while download/upload work is active, when available.
- **Test duration:** total time the measurement engine spent running, excluding paused time.

The median is deliberately used for the main throughput number so one brief high outlier is less likely to dominate the estimate. A wide p10–p90 spread indicates that individual requests varied substantially; it does not prove that the ISP is unstable. Browser scheduling, local CPU load, Wi-Fi contention, VPNs, server capacity, routing, caching, and background traffic can influence the result.

Cloudflare's own measurement documentation defines the underlying request sizes, browser-timing calculations, result getters, and measurement options: [Cloudflare Speedtest README](https://github.com/cloudflare/speedtest).

## 6. Applying the result to the calculator

Only a finite, positive median upload measurement can be applied. The bit/s value is converted to Mbps without rounding the underlying value to the displayed two decimal places. The calculator then recalculates using that median upload rate.

Additional throughput reduction is reset to **0%** when a measurement is applied. The test result already represents measured throughput over the test route; automatically adding another generic reduction could double-count losses. Visitors can manually choose an additional reduction if they have a separate reason to do so.

The download result is never substituted for upload speed.

## 7. Failure handling

- If the package cannot load, the manual calculator remains available.
- If individual requests fail, the interface reports a partial result and uses only valid samples.
- If upload bandwidth is unavailable, the apply action remains disabled.
- A visitor can stop or retry the test.
- Browser extensions, network filters, captive portals, firewalls, and restrictive networks may block the measurement endpoints.
- A small number of successful requests is shown as limited sampling rather than being presented as a strong consistency reading.

## 8. Maintenance notes

- Keep the package version pinned exactly in `package.json`.
- Recheck Cloudflare's official package documentation before changing measurement options or result getters.
- Keep `logAimApiUrl: null` and `logMeasurementApiUrl: null` unless the privacy design is deliberately reviewed and changed.
- Recalculate the maximum payload whenever the measurement plan changes.
- Keep browser tests mocked; CI must never consume real user or runner bandwidth against external speed-test endpoints.

# Network Speed Test Methodology

## 1. Purpose

TransferETA includes an optional browser-based network test so a visitor can measure the current upload connection and reuse that measurement in the upload-time calculator. It is a convenience measurement, not an ISP certification or a guarantee of future throughput.

## 2. Measurement provider

The implementation uses Cloudflare's official [`@cloudflare/speedtest`](https://github.com/cloudflare/speedtest) JavaScript module, the measurement engine used by Cloudflare's public speed-test application. The module sends test requests directly from the visitor's browser to Cloudflare's edge network and uses the browser Performance Resource Timing API to calculate throughput and latency measurements.

This is intentionally not a homemade `fetch()` timer or a measurement against TransferETA's own server. It measures the route between the current device/browser and the Cloudflare edge selected by network routing. Another speed-test provider or destination can produce different results.

## 3. Explicit opt-in and data flow

1. The speed-test code is dynamically imported only after the visitor presses **Start speed test**.
2. The browser performs a bounded set of latency, download, and upload measurements against Cloudflare's public speed-test endpoints.
3. The engine returns upload/download bandwidth, idle latency, jitter, and loaded latency where available.
4. The measurements remain in page memory. TransferETA does not send them to a TransferETA server or persist a history.
5. The visitor must press **Use measured upload speed** to copy the upload measurement to the upload-time calculator.

The application explicitly sets both `logAimApiUrl` and `logMeasurementApiUrl` to `null`, disabling the package's optional final-result and per-measurement logging endpoints. The test requests themselves still go to Cloudflare. Cloudflare receives normal network request metadata, which can include the visitor IP address, request timing, and the volume of test traffic. The interface discloses this before the user starts the test. Visitors should review Cloudflare's own privacy information and terms before opting in.

No credentials/cookies are sent (`includeCredentials: false`). No packet-loss/TURN measurement is enabled because that optional measurement requires separate TURN server configuration and credentials.

## 4. Bounded measurement plan

The configured sample plan contains:

| Direction / measurement | Payload plan | Maximum payload |
|---|---:|---:|
| Initial latency | 3 packets | 0 file payload |
| Initial download | 100 KB × 1 | 0.1 MB |
| Follow-up latency | 6 packets | 0 file payload |
| Download ramp | 1 MB × 3, then 10 MB × 2 | 23.0 MB after initial sample |
| Upload ramp | 100 KB × 3, 1 MB × 3, then 5 MB × 2 | 13.3 MB |
| **Total maximum payload** |  | **36.4 MB** |

The engine stops attempting larger payload sizes for a direction once the configured request-duration threshold is reached. Consequently, many connections will use less than this maximum. This bound is a payload budget, not an exact total of every HTTP header or protocol byte.

The test also uses a 10-second per-request abort threshold and a 45-second overall runtime cap. The visitor can stop a run earlier.

## 5. Result semantics

- **Upload:** measured payload throughput from browser POST measurements, returned by Cloudflare's engine in bits per second.
- **Download:** measured payload throughput from browser download measurements, returned in bits per second.
- **Ping:** median idle latency in milliseconds, when sufficient latency samples exist.
- **Jitter:** variation between consecutive idle latency samples, when enough samples exist.
- **Loaded latency:** latency measured while download/upload work is active, when available.

The bandwidth engine uses a percentile-based reduction (configured to the 90th percentile) over valid samples. This is a measurement summary, not a guarantee that the same rate will be sustained by every file host or throughout a future transfer. Wi-Fi conditions, VPNs, browser scheduling, server capacity, routing, and network congestion can all change the result.

## 6. Applying the result to the calculator

Only a finite, positive upload measurement can be applied. The bit/s value is converted to Mbps for the upload-speed input without rounding the underlying value to the displayed two decimal places. The calculator then recalculates using that measured speed.

Additional throughput reduction is reset to **0%** when a measurement is applied. The speed-test result already reflects the measured conditions of that test; applying another generic reduction by default would risk counting the same loss twice. Visitors can manually select an additional reduction later if they have a reason to do so.

The download result is never substituted for upload speed.

## 7. Failure handling

- If the package cannot load, the manual calculator remains available.
- If one or more phases fail, the interface reports a partial result rather than a clean success.
- If upload bandwidth is unavailable, the apply action remains disabled.
- A visitor can stop or retry the test.
- Browser extensions, network filters, captive portals, firewall rules, or restrictive networks may block the measurement endpoints.

## 8. Maintenance notes

- Keep the package version pinned exactly in `package.json`.
- Recheck Cloudflare's official package documentation before changing measurement options or result getters.
- Keep the explicit `logAimApiUrl: null` and `logMeasurementApiUrl: null` settings unless the privacy design is deliberately reviewed and changed.
- Recalculate the stated maximum payload whenever the measurement plan changes.
- Keep browser tests mocked; CI must never consume real user or runner bandwidth against external speed-test endpoints.

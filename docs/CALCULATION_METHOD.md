# Calculation Method & Unit Specification

## 1. Canonical units

All calculations use:

- **File size:** bytes.
- **Transfer rate:** bits per second.
- **Duration:** seconds.

Conversions happen at the input boundary. Core formulas operate only on canonical values.

## 2. Bit and byte conventions

A byte contains 8 bits.

### SI decimal prefixes

| Unit | Exact multiplier |
|---|---:|
| kbit/s (kb/s) | 1,000 bit/s |
| Mbit/s (Mb/s) | 1,000,000 bit/s |
| Gbit/s (Gb/s) | 1,000,000,000 bit/s |
| kB | 1,000 bytes |
| MB | 1,000,000 bytes |
| GB | 1,000,000,000 bytes |
| TB | 1,000,000,000,000 bytes |

### IEC binary prefixes

| Unit | Exact multiplier |
|---|---:|
| KiB | 1,024 bytes |
| MiB | 1,048,576 bytes |
| GiB | 1,073,741,824 bytes |
| TiB | 1,099,511,627,776 bytes |

### Case is significant

- `b` means bit.
- `B` means byte.
- `Mb/s` means megabits per second.
- `MB/s` means megabytes per second.
- `1 MB/s = 8 Mb/s` under SI decimal units.

The UI should spell out “megabits per second” and “megabytes per second” in accessible names or supporting text. Do not rely on letter case alone when a user may not know the distinction.

## 3. Throughput-loss model

The optional percentage is defined in TransferETA as **throughput reduction**: the fraction of nominal line or plan rate that is not available for payload in this simplified estimate.

Let:
- `R` = nominal throughput in bits per second.
- `L` = throughput-loss fraction, where `0 <= L < 1`.
- `E` = effective payload throughput in bits per second.

Then:

```text
E = R × (1 − L)
```

The initial UI should call this control “Estimated throughput reduction” or “Estimated overhead / speed loss” and explain the model. Presets may offer 0%, 5%, 10%, 15%, and 20%, but 0% must be the default.

Important note: a speed-test result is usually already a measured throughput value. Applying an additional reduction to a measured speed can count the loss twice. The interface must explain that users who enter a measured upload speed should normally keep this setting at 0% unless they have a specific reason to apply another reduction.

This is a transparent planning model, not a packet-level simulation of every protocol, retransmission, server limit, Wi-Fi condition, or ISP policy.

## 4. Upload-time formula

Let:
- `S` = file size in bytes.
- `E` = effective payload rate in bits per second.
- `T` = estimated duration in seconds.

```text
T = (S × 8) / E
```

If `S = 0`, the duration is 0 seconds. If `E <= 0`, the input is invalid and the calculator must not return a finite estimate.

## 5. Required-speed formula

For a target duration `T > 0` and file size `S`:

```text
Required effective rate = (S × 8) / T
Required nominal rate = Required effective rate / (1 − L)
```

The main answer should be the required nominal rate, because the user compares it with a plan or speed-test result. Show the effective payload rate as a supporting value so the assumption remains transparent.

## 6. Maximum-transferable-size formula

For nominal throughput `R`, duration `T`, and throughput-loss fraction `L`:

```text
Maximum bytes = (R × (1 − L) × T) / 8
```

The displayed size should be labelled as an estimate and formatted with the selected SI or IEC convention.

## 7. Worked examples

Assuming decimal GB and Mbps:

| File size | Nominal upload rate | Loss | Effective rate | Estimate |
|---|---:|---:|---:|---:|
| 100 MB | 1 Mb/s | 0% | 1 Mb/s | 13 min 20 sec |
| 1 GB | 10 Mb/s | 0% | 10 Mb/s | 13 min 20 sec |
| 1 GB | 100 Mb/s | 0% | 100 Mb/s | 1 min 20 sec |
| 1 GB | 10 MB/s | 0% | 80 Mb/s | 1 min 40 sec |
| 1 GB | 10 Mb/s | 10% | 9 Mb/s | about 14 min 49 sec |

The last value is 8,000,000,000 bits ÷ 9,000,000 bits/s = 888.888… seconds.

## 8. Precision and display rules

- Preserve the full JavaScript number precision available for the calculation; do not round intermediate conversions.
- Validate that results are finite and within supported numeric bounds.
- Round only for display.
- Do not display a valid positive duration as `0 seconds`; for very short durations, show an appropriate sub-second or “less than 1 second” label.
- Use a consistent duration formatter with pluralization.
- Display enough precision for useful comparison, but avoid implying real-world certainty that the model cannot support.
- If an input magnitude exceeds safe supported limits, show a clear message rather than `Infinity` or a misleading result.

## 9. Floating-point and range handling

JavaScript uses IEEE-754 numbers. For the planned everyday file sizes and network speeds, `number` is sufficient when conversions are carefully bounded. The implementation must:

- Check `Number.isFinite` after parsing and after calculations.
- Reject values that exceed the documented maximum supported input range.
- Avoid integer bitwise operators for large sizes because they are limited to 32-bit operations.
- Consider `BigInt` only if the product later requires exact representation of sizes beyond safe integer ranges; `BigInt` does not mix directly with floating-point rates and would need a deliberate numeric model.
- Ensure duration formatting cannot overflow when converting seconds into larger time units.

## 10. Required unit tests

- 1 byte = 8 bits.
- 1 MB = 1,000,000 bytes.
- 1 MiB = 1,048,576 bytes.
- 1 MB/s = 8 Mb/s.
- All SI and IEC unit factors.
- Zero-byte input returns zero duration.
- Zero or negative speed is rejected.
- Negative file size is rejected.
- Throughput loss outside 0–99.9% is rejected.
- 1 GB at 10 Mb/s and 0% loss is 800 seconds.
- 1 GB at 100 Mb/s and 0% loss is 80 seconds.
- 1 GB at 10 MB/s and 0% loss is 100 seconds.
- 1 GB at 10 Mb/s and 10% loss is approximately 888.888… seconds.
- Required-speed and maximum-size functions are tested as algebraic inverses within a documented floating-point tolerance.
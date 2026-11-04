import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("loads the calculator with a useful example estimate", async ({ page }) => {
  await expect(page).toHaveTitle(/TransferETA/);
  await expect(page.getByRole("heading", { name: /Your next upload/i })).toBeVisible();
  await expect(page.locator("#result-value")).toContainText("13m 20s");
});

test("calculates a different upload speed", async ({ page }) => {
  await page.locator("#speed-value").fill("10");
  await page.locator("#speed-unit").selectOption("Mbps");
  await page.getByRole("button", { name: /Calculate upload time/i }).click();
  await expect(page.locator("#result-value")).toContainText("2h 13m");
});

test("calculates required upload speed", async ({ page }) => {
  await page.getByRole("tab", { name: /Required speed/i }).click();
  await page.locator("#target-minutes").fill("5");
  await page.getByRole("button", { name: /Calculate required speed/i }).click();
  await expect(page.locator("#result-value")).toContainText("266.67");
});

test("calculates maximum transferable file size", async ({ page }) => {
  await page.getByRole("tab", { name: /Max file size/i }).click();
  await page.locator("#target-minutes").fill("30");
  await page.getByRole("button", { name: /Calculate maximum file size/i }).click();
  await expect(page.locator("#result-value")).toContainText("22.5 GB");
});

test("shows validation feedback for an empty upload speed", async ({ page }) => {
  await page.locator("#speed-value").fill("");
  await page.getByRole("button", { name: /Calculate upload time/i }).click();
  await expect(page.getByRole("alert")).toContainText("Enter upload speed");
});

test("supports the light and dark themes", async ({ page }) => {
  await page.getByRole("button", { name: /Switch to dark theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /Switch to light theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("keeps the simulation explicitly labelled as a preview", async ({ page }) => {
  await expect(page.getByText("SIMULATION ONLY")).toBeVisible();
  await expect(page.getByText(/not a live upload/i)).toBeVisible();
});


test("speed test is opt-in and discloses the external measurement provider", async ({ page }) => {
  const providerRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname === "speed.cloudflare.com") {
      providerRequests.push(request.url());
    }
  });

  await expect(page.getByRole("heading", { name: /Test first\. Estimate with real data/i })).toBeVisible();
  await expect(page.locator("#speed-test-status")).toContainText("starts only when you press");
  await expect(page.getByText(/your IP address/i)).toBeVisible();
  expect(providerRequests).toHaveLength(0);
});

test("speed test can be started and cancelled without making a real network test", async ({ page }) => {
  await page.route("https://speed.cloudflare.com/**", async (route) => {
    // Keep the mocked phase active long enough to test the real start/cancel UI.
    await new Promise((resolve) => setTimeout(resolve, 350));
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname.endsWith("/__down")) {
      const byteCount = Math.min(Number(requestUrl.searchParams.get("bytes") ?? 0), 10_000_000);
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/octet-stream",
          "cache-control": "no-store",
          "timing-allow-origin": "*",
          "server-timing": "cfRequestDuration;dur=0",
        },
        body: Buffer.alloc(Number.isFinite(byteCount) ? byteCount : 0),
      });
    } else {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/plain",
          "cache-control": "no-store",
          "timing-allow-origin": "*",
          "server-timing": "cfRequestDuration;dur=0",
        },
        body: "ok",
      });
    }
  });

  await page.locator("#speed-test-start").click();
  await expect(page.locator("#speed-test-cancel")).toBeVisible();
  await expect(page.locator("#speed-test-badge")).toContainText(/TESTING/i);
  await expect(page.locator("#speed-test-phase")).toContainText(/Measuring latency/i, { timeout: 10_000 });
  await page.locator("#speed-test-cancel").click();
  await expect(page.locator("#speed-test-badge")).toContainText("STOPPED");
  await expect(page.locator("#speed-test-apply")).toBeDisabled();
});

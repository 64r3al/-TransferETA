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

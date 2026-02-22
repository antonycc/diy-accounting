// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd

// web/browser-tests/gateway-content.browser.test.js
// Browser tests for gateway static HTML content using Playwright

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const publicDir = path.join(process.cwd(), "web/www.spreadsheets.diyaccounting.co.uk/public");

function readHtml(filename) {
  return fs.readFileSync(path.join(publicDir, filename), "utf-8");
}

test.describe("Gateway index.html", () => {
  test("has correct meta tags", async ({ page }) => {
    await page.setContent(readHtml("index.html"), { waitUntil: "domcontentloaded" });

    // Title
    const title = await page.title();
    expect(title).toContain("DIY Accounting");

    // Meta description
    const metaDesc = page.locator('meta[name="description"]');
    const descContent = await metaDesc.getAttribute("content");
    expect(descContent).toBeTruthy();
    expect(descContent.length).toBeGreaterThan(20);

    // Charset
    const charset = page.locator("meta[charset]");
    const charsetVal = await charset.getAttribute("charset");
    expect(charsetVal.toLowerCase()).toBe("utf-8");

    // Viewport
    const viewport = page.locator('meta[name="viewport"]');
    const vpContent = await viewport.getAttribute("content");
    expect(vpContent).toContain("width=device-width");
  });

  test("has navigation buttons", async ({ page }) => {
    await page.setContent(readHtml("index.html"), { waitUntil: "domcontentloaded" });

    const submitLink = page.locator('a.gateway-btn:has-text("Submit")');
    await expect(submitLink).toBeVisible();
    const submitHref = await submitLink.getAttribute("href");
    expect(submitHref).toMatch(/submit\.diyaccounting\.co\.uk/);

    const spreadsheetsLink = page.locator('a.gateway-btn:has-text("Spreadsheets")');
    await expect(spreadsheetsLink).toBeVisible();
    const spreadsheetsHref = await spreadsheetsLink.getAttribute("href");
    expect(spreadsheetsHref).toMatch(/spreadsheets\.diyaccounting\.co\.uk/);
  });

  test("has JSON-LD structured data", async ({ page }) => {
    await page.setContent(readHtml("index.html"), { waitUntil: "domcontentloaded" });

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    const count = await jsonLdScript.count();
    expect(count).toBeGreaterThan(0);
    const content = await jsonLdScript.first().textContent();
    const jsonLd = JSON.parse(content);
    expect(jsonLd["@type"]).toBe("Organization");
    expect(jsonLd.name).toContain("DIY Accounting");
  });

  test("has footer with required links", async ({ page }) => {
    await page.setContent(readHtml("index.html"), { waitUntil: "domcontentloaded" });

    await expect(page.locator('footer a[href*="privacy"]')).toBeVisible();
    await expect(page.locator('footer a[href*="terms"]')).toBeVisible();
    await expect(page.locator('footer a[href*="accessibility"]')).toBeVisible();

    const footerText = await page.locator("footer").textContent();
    expect(footerText).toContain("DIY Accounting Ltd");
  });

  test("has company summary", async ({ page }) => {
    await page.setContent(readHtml("index.html"), { waitUntil: "domcontentloaded" });

    const summary = page.locator(".company-summary");
    await expect(summary).toBeVisible();
    const text = await summary.textContent();
    expect(text).toContain("2006");
    expect(text).toContain("Terry Cartwright");
  });
});

test.describe("Gateway about.html", () => {
  test("has correct title and heading", async ({ page }) => {
    await page.setContent(readHtml("about.html"), { waitUntil: "domcontentloaded" });

    const title = await page.title();
    expect(title).toContain("About");
    expect(title).toContain("DIY Accounting");

    const heading = page.locator("header h1");
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText).toContain("DIY Accounting Ltd");
  });

  test("has company information", async ({ page }) => {
    await page.setContent(readHtml("about.html"), { waitUntil: "domcontentloaded" });

    const body = await page.textContent("body");
    expect(body).toContain("Antony Cartwright");
    expect(body).toContain("Jane Grundy");
    expect(body).toContain("Samantha Cartwright");
    expect(body).toContain("Terry Cartwright");
    expect(body).toContain("06846849");
    expect(body).toContain("37 Sutherland Avenue");
  });

  test("has home link", async ({ page }) => {
    await page.setContent(readHtml("about.html"), { waitUntil: "domcontentloaded" });

    const homeLink = page.locator('a[href="index.html"]').first();
    await expect(homeLink).toBeVisible();
  });
});

test.describe("All HTML pages have required structure", () => {
  const htmlFiles = fs.readdirSync(publicDir).filter((f) => f.endsWith(".html"));

  for (const file of htmlFiles) {
    test(`${file} has <html lang> attribute`, async ({ page }) => {
      await page.setContent(readHtml(file), { waitUntil: "domcontentloaded" });

      const htmlTag = page.locator("html");
      const lang = await htmlTag.getAttribute("lang");
      expect(lang, `${file} should have lang attribute`).toBeTruthy();
    });
  }
});

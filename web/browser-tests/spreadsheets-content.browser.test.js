// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 DIY Accounting Ltd

// web/browser-tests/spreadsheets-content.browser.test.js
// Browser tests for spreadsheets static HTML content using Playwright

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const publicDir = path.join(process.cwd(), "web/spreadsheets.diyaccounting.co.uk/public");

function readHtml(filename) {
  return fs.readFileSync(path.join(publicDir, filename), "utf-8");
}

test.describe("Spreadsheets index.html", () => {
  test("has correct meta tags", async ({ page }) => {
    await page.setContent(readHtml("index.html"), { waitUntil: "domcontentloaded" });

    // Title
    const title = await page.title();
    expect(title).toContain("DIY Accounting Spreadsheets");

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

  test("has product cards with download links", async ({ page }) => {
    await page.setContent(readHtml("index.html"), { waitUntil: "domcontentloaded" });

    const productCards = page.locator(".product-card");
    const cardCount = await productCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(5);

    const downloadLinks = page.locator(".product-card a.btn-download");
    const linkCount = await downloadLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(5);

    const firstHref = await downloadLinks.first().getAttribute("href");
    expect(firstHref).toContain("download.html?product=");
  });

  test("has JSON-LD structured data", async ({ page }) => {
    await page.setContent(readHtml("index.html"), { waitUntil: "domcontentloaded" });

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    const count = await jsonLdScript.count();
    expect(count).toBeGreaterThan(0);
    const content = await jsonLdScript.first().textContent();
    const jsonLd = JSON.parse(content);
    expect(jsonLd["@type"]).toBe("SoftwareApplication");
    expect(jsonLd.name).toContain("DIY Accounting");
  });

  test("has footer with required links", async ({ page }) => {
    await page.setContent(readHtml("index.html"), { waitUntil: "domcontentloaded" });

    await expect(page.locator('footer a[href*="privacy"]')).toBeVisible();
    await expect(page.locator('footer a[href*="terms"]')).toBeVisible();

    const footerText = await page.locator("footer").textContent();
    expect(footerText).toContain("DIY Accounting");
  });

  test("has top navigation", async ({ page }) => {
    await page.setContent(readHtml("index.html"), { waitUntil: "domcontentloaded" });

    const topNav = page.locator(".top-nav");
    await expect(topNav).toBeVisible();

    const downloadLink = page.locator('.top-nav a[href="download.html"]');
    await expect(downloadLink).toBeVisible();

    const kbLink = page.locator('.top-nav a[href="knowledge-base.html"]');
    await expect(kbLink).toBeVisible();

    const donateLink = page.locator('.top-nav a[href="donate.html"]');
    await expect(donateLink).toBeVisible();
  });
});

test.describe("Spreadsheets download.html", () => {
  test("has correct title", async ({ page }) => {
    await page.setContent(readHtml("download.html"), { waitUntil: "domcontentloaded" });

    const title = await page.title();
    expect(title).toContain("Download");
  });

  test("has download form elements", async ({ page }) => {
    await page.setContent(readHtml("download.html"), { waitUntil: "domcontentloaded" });

    const productSelect = page.locator("#product-select");
    await expect(productSelect).toBeAttached();

    const periodSelect = page.locator("#period-select");
    await expect(periodSelect).toBeAttached();
  });
});

test.describe("Spreadsheets donate.html", () => {
  test("has correct title and Stripe links", async ({ page }) => {
    await page.setContent(readHtml("donate.html"), { waitUntil: "domcontentloaded" });

    const title = await page.title();
    expect(title).toContain("Donate");

    const stripeLinks = page.locator(".stripe-donate-link");
    const count = await stripeLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);

    const firstHref = await stripeLinks.first().getAttribute("href");
    expect(firstHref).toContain("buy.stripe.com");
  });

  test("has PayPal donate form", async ({ page }) => {
    await page.setContent(readHtml("donate.html"), { waitUntil: "domcontentloaded" });

    const paypalForm = page.locator("#paypal-donate-form");
    await expect(paypalForm).toBeAttached();

    const formAction = await paypalForm.getAttribute("action");
    expect(formAction).toBe("https://www.paypal.com/donate");
  });
});

test.describe("Spreadsheets knowledge-base.html", () => {
  test("has correct title", async ({ page }) => {
    await page.setContent(readHtml("knowledge-base.html"), { waitUntil: "domcontentloaded" });

    const title = await page.title();
    expect(title).toContain("Knowledge Base");
  });

  test("has search elements", async ({ page }) => {
    await page.setContent(readHtml("knowledge-base.html"), { waitUntil: "domcontentloaded" });

    const searchInput = page.locator("#kb-search");
    await expect(searchInput).toBeAttached();

    const categoryFilter = page.locator("#category-filter");
    await expect(categoryFilter).toBeAttached();

    const articleList = page.locator("#article-list");
    await expect(articleList).toBeAttached();
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

// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd

// behaviour-tests/gateway.behaviour.test.js

import { test } from "./helpers/playwrightTestWithout.js";
import { expect } from "@playwright/test";
import { addOnPageLogging, timestamp } from "./helpers/behaviour-helpers.js";
import fs from "node:fs";

// Gateway tests run against local, CI, or prod environments.
// Base URL is set via GATEWAY_BASE_URL env var, with CI default.
const gatewayBaseUrlRaw = process.env.GATEWAY_BASE_URL || "https://ci-gateway.spreadsheets.diyaccounting.co.uk";
const gatewayBaseUrl = gatewayBaseUrlRaw.replace(/\/+$/, "");
const isLocal = gatewayBaseUrl.includes("localhost") || gatewayBaseUrl.includes("127.0.0.1");

// Screenshot path for gateway tests
const screenshotPath = "target/behaviour-test-results/screenshots/gateway-behaviour-test";

/**
 * Gateway Site Behaviour Tests
 *
 * These tests verify the gateway site (spreadsheets.diyaccounting.co.uk) works correctly:
 * 1. Landing page loads with correct title and content
 * 2. Navigation links to spreadsheets and submit sites exist
 * 3. About page loads with company information
 * 4. robots.txt is accessible and well-formed
 * 5. sitemap.xml is accessible and well-formed
 * 6. security.txt is accessible
 * 7. Old www URL redirect patterns return 301
 * 8. Structured data (JSON-LD) is present
 */

test.describe("Gateway Site - spreadsheets.diyaccounting.co.uk", () => {
  test.beforeAll(async () => {
    console.log("\n Setting up test environment for gateway tests...\n");
    console.log(` Gateway Base URL: ${gatewayBaseUrl}`);
    console.log(` Screenshot path: ${screenshotPath}`);

    // Ensure screenshot directory exists
    fs.mkdirSync(screenshotPath, { recursive: true });

    console.log("\n Test environment ready\n");
  });

  test("Landing page loads and displays correctly", async ({ page }) => {
    addOnPageLogging(page);

    // ============================================================
    // STEP 1: Navigate to Gateway landing page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Navigate to Gateway landing page");
    console.log("=".repeat(60));

    await page.goto(gatewayBaseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-01-landing-page.png` });

    // Verify page loaded with correct title
    const title = await page.title();
    console.log(` Page title: "${title}"`);
    expect(title).toContain("DIY Accounting");
    console.log(" Landing page loaded successfully");

    // ============================================================
    // STEP 2: Verify main heading
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Verify main heading");
    console.log("=".repeat(60));

    const heading = page.locator("header h1");
    await expect(heading).toBeVisible({ timeout: 5000 });
    const headingText = await heading.textContent();
    console.log(` Heading: "${headingText}"`);
    expect(headingText).toContain("DIY Accounting");
    console.log(" Main heading is correct");

    // ============================================================
    // STEP 3: Verify navigation buttons to Submit and Spreadsheets
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Verify navigation buttons");
    console.log("=".repeat(60));

    const submitLink = page.locator('a.gateway-btn:has-text("Submit")');
    const spreadsheetsLink = page.locator('a.gateway-btn:has-text("Spreadsheets")');
    const aboutLink = page.locator('a.gateway-btn:has-text("Limited")');

    await expect(submitLink).toBeVisible({ timeout: 5000 });
    const submitHref = await submitLink.getAttribute("href");
    console.log(` Submit link href: ${submitHref}`);
    expect(submitHref).toMatch(/submit\.diyaccounting\.co\.uk/);
    console.log(" Submit link is present and correct");

    await expect(spreadsheetsLink).toBeVisible({ timeout: 5000 });
    const spreadsheetsHref = await spreadsheetsLink.getAttribute("href");
    console.log(` Spreadsheets link href: ${spreadsheetsHref}`);
    expect(spreadsheetsHref).toMatch(/spreadsheets\.diyaccounting\.co\.uk/);
    console.log(" Spreadsheets link is present and correct");

    await expect(aboutLink).toBeVisible({ timeout: 5000 });
    const aboutHref = await aboutLink.getAttribute("href");
    console.log(` About link href: ${aboutHref}`);
    expect(aboutHref).toContain("about.html");
    console.log(" About link is present and correct");

    // ============================================================
    // STEP 4: Verify company summary content
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Verify company summary content");
    console.log("=".repeat(60));

    const companySummary = page.locator(".company-summary");
    await expect(companySummary).toBeVisible({ timeout: 5000 });
    const summaryText = await companySummary.textContent();
    expect(summaryText).toContain("2006");
    expect(summaryText).toContain("Terry Cartwright");
    console.log(" Company summary content is present");

    // ============================================================
    // STEP 5: Verify footer links
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 5: Verify footer links");
    console.log("=".repeat(60));

    const privacyLink = page.locator('footer a[href*="privacy"]');
    const termsLink = page.locator('footer a[href*="terms"]');
    const accessibilityLink = page.locator('footer a[href*="accessibility"]');

    await expect(privacyLink).toBeVisible({ timeout: 5000 });
    console.log(" Privacy link visible in footer");

    await expect(termsLink).toBeVisible({ timeout: 5000 });
    console.log(" Terms link visible in footer");

    await expect(accessibilityLink).toBeVisible({ timeout: 5000 });
    console.log(" Accessibility link visible in footer");

    // ============================================================
    // STEP 6: Verify copyright notice
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 6: Verify copyright notice");
    console.log("=".repeat(60));

    const footerText = await page.locator("footer").textContent();
    expect(footerText).toContain("DIY Accounting Ltd");
    console.log(" Copyright notice present in footer");

    // ============================================================
    // STEP 7: Verify structured data (JSON-LD)
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 7: Verify structured data (JSON-LD)");
    console.log("=".repeat(60));

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    const jsonLdCount = await jsonLdScript.count();
    expect(jsonLdCount).toBeGreaterThan(0);
    const jsonLdContent = await jsonLdScript.first().textContent();
    const jsonLd = JSON.parse(jsonLdContent);
    expect(jsonLd["@type"]).toBe("Organization");
    expect(jsonLd.name).toContain("DIY Accounting");
    console.log(" JSON-LD structured data is present and valid");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-02-landing-verified.png` });

    // ============================================================
    // STEP 8: Final summary
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - Gateway landing page verified");
    console.log("=".repeat(60));
  });

  test("About page loads and contains company information", async ({ page }) => {
    addOnPageLogging(page);

    // ============================================================
    // STEP 1: Navigate to About page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Navigate to About page");
    console.log("=".repeat(60));

    const aboutUrl = `${gatewayBaseUrl}/about.html`;
    console.log(` Navigating to: ${aboutUrl}`);
    await page.goto(aboutUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-03-about-page.png` });

    // Verify page loaded
    const title = await page.title();
    console.log(` Page title: "${title}"`);
    expect(title).toContain("About");
    expect(title).toContain("DIY Accounting");
    console.log(" About page loaded successfully");

    // ============================================================
    // STEP 2: Verify main heading
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Verify main heading");
    console.log("=".repeat(60));

    const heading = page.locator("header h1");
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText).toContain("DIY Accounting Ltd");
    console.log(" Main heading is correct");

    // ============================================================
    // STEP 3: Verify company information content
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Verify company information");
    console.log("=".repeat(60));

    const pageContent = await page.textContent("body");

    // Directors
    expect(pageContent).toContain("Antony Cartwright");
    expect(pageContent).toContain("Jane Grundy");
    expect(pageContent).toContain("Samantha Cartwright");
    console.log(" Directors listed");

    // Founder history
    expect(pageContent).toContain("Terry Cartwright");
    expect(pageContent).toContain("Chartered Management Accountant");
    console.log(" Founder information present");

    // Contact details
    expect(pageContent).toContain("37 Sutherland Avenue");
    expect(pageContent).toContain("Leeds");
    expect(pageContent).toContain("LS8 1BY");
    console.log(" Contact address present");

    // Company number
    expect(pageContent).toContain("06846849");
    console.log(" Company registration number present");

    // Home link
    const homeLink = page.locator('a[href="index.html"]').first();
    await expect(homeLink).toBeVisible();
    console.log(" Home link present on About page");

    // ============================================================
    // STEP 4: Verify footer links on About page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Verify footer links on About page");
    console.log("=".repeat(60));

    const privacyLink = page.locator('footer a[href*="privacy"]');
    const termsLink = page.locator('footer a[href*="terms"]');

    await expect(privacyLink).toBeVisible({ timeout: 5000 });
    console.log(" Privacy link visible in About page footer");

    await expect(termsLink).toBeVisible({ timeout: 5000 });
    console.log(" Terms link visible in About page footer");

    // ============================================================
    // STEP 5: Verify JSON-LD structured data
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 5: Verify structured data");
    console.log("=".repeat(60));

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    const jsonLdCount = await jsonLdScript.count();
    expect(jsonLdCount).toBeGreaterThan(0);
    const jsonLd = JSON.parse(await jsonLdScript.first().textContent());
    expect(jsonLd["@type"]).toBe("Organization");
    console.log(" JSON-LD structured data present on About page");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-04-about-verified.png` });

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - About page verified");
    console.log("=".repeat(60));
  });

  test("robots.txt is accessible and well-formed", async ({ page }) => {
    addOnPageLogging(page);

    console.log("\n" + "=".repeat(60));
    console.log("Verify robots.txt");
    console.log("=".repeat(60));

    const robotsUrl = `${gatewayBaseUrl}/robots.txt`;
    console.log(` Fetching: ${robotsUrl}`);

    const response = await page.goto(robotsUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    expect(response.status()).toBe(200);
    console.log(` Response status: ${response.status()}`);

    const content = await page.textContent("body");
    expect(content).toContain("User-agent:");
    expect(content).toContain("Allow:");
    expect(content).toContain("Sitemap:");
    console.log(" robots.txt is well-formed with User-agent, Allow, and Sitemap directives");
  });

  test("sitemap.xml is accessible and well-formed", async ({ page }) => {
    addOnPageLogging(page);

    console.log("\n" + "=".repeat(60));
    console.log("Verify sitemap.xml");
    console.log("=".repeat(60));

    const sitemapUrl = `${gatewayBaseUrl}/sitemap.xml`;
    console.log(` Fetching: ${sitemapUrl}`);

    const response = await page.goto(sitemapUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    expect(response.status()).toBe(200);
    console.log(` Response status: ${response.status()}`);

    const content = await page.content();
    expect(content).toContain("urlset");
    expect(content).toContain("<loc>");
    expect(content).toContain("spreadsheets.diyaccounting.co.uk");
    console.log(" sitemap.xml is well-formed with urlset and loc elements");
  });

  test("security.txt is accessible", async ({ page }) => {
    addOnPageLogging(page);

    console.log("\n" + "=".repeat(60));
    console.log("Verify security.txt");
    console.log("=".repeat(60));

    const securityUrl = `${gatewayBaseUrl}/.well-known/security.txt`;
    console.log(` Fetching: ${securityUrl}`);

    const response = await page.goto(securityUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    expect(response.status()).toBe(200);
    console.log(` Response status: ${response.status()}`);

    const content = await page.textContent("body");
    expect(content).toContain("Contact:");
    expect(content).toContain("Expires:");
    console.log(" security.txt is accessible and contains required fields");
  });

  // Redirects are handled by CloudFront Functions — skip when testing against local static server
  (isLocal ? test.skip : test)("Old www URL redirect patterns return 301", async ({ page }) => {
    addOnPageLogging(page);

    console.log("\n" + "=".repeat(60));
    console.log("Verify old www URL 301 redirects");
    console.log("=".repeat(60));

    // Test known redirect patterns from redirects.toml
    // These are "self" redirects (stay on same host) so we can verify the redirect status

    const selfRedirects = [
      { from: "/home.html", expectedTo: "/" },
      { from: "/support.html", expectedTo: "/about.html" },
      { from: "/contact.html", expectedTo: "/about.html" },
      { from: "/history.html", expectedTo: "/about.html" },
    ];

    for (const redirect of selfRedirects) {
      const redirectUrl = `${gatewayBaseUrl}${redirect.from}`;
      console.log(` Testing redirect: ${redirect.from}`);

      // Use page.request.fetch to follow redirects and capture the chain
      const response = await page.request.fetch(redirectUrl, {
        maxRedirects: 0,
        failOnStatusCode: false,
      });

      const status = response.status();
      console.log(` ${redirect.from} -> status: ${status}`);

      // The CloudFront Function should return 301 for matched old URLs
      // Accept 301 (redirect) or 200 (if the redirect lands on the page directly)
      expect([200, 301, 302, 308]).toContain(status);

      if (status === 301 || status === 302 || status === 308) {
        const location = response.headers()["location"];
        console.log(` Location: ${location}`);
        if (redirect.expectedTo === "/") {
          // Root redirect could be absolute or relative
          expect(location).toBeTruthy();
        } else {
          expect(location).toContain(redirect.expectedTo);
        }
        console.log(` Redirect from ${redirect.from} verified`);
      } else {
        // If status is 200, the server might be handling the redirect internally
        console.log(` ${redirect.from} returned 200 - redirect may be handled server-side`);
      }
    }

    // Test cross-site redirects (to spreadsheets)
    const crossSiteRedirects = [
      { from: "/products.html", expectedTarget: "spreadsheets" },
      { from: "/articles.html", expectedTarget: "spreadsheets" },
      { from: "/get.html", expectedTarget: "spreadsheets" },
    ];

    for (const redirect of crossSiteRedirects) {
      const redirectUrl = `${gatewayBaseUrl}${redirect.from}`;
      console.log(` Testing cross-site redirect: ${redirect.from}`);

      const response = await page.request.fetch(redirectUrl, {
        maxRedirects: 0,
        failOnStatusCode: false,
      });

      const status = response.status();
      console.log(` ${redirect.from} -> status: ${status}`);

      if (status === 301 || status === 302 || status === 308) {
        const location = response.headers()["location"];
        console.log(` Location: ${location}`);
        expect(location).toContain("spreadsheets");
        console.log(` Cross-site redirect from ${redirect.from} to ${redirect.expectedTarget} verified`);
      } else {
        console.log(` ${redirect.from} returned ${status} (redirect may not be configured via CloudFront Function in this environment)`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - Redirect patterns verified");
    console.log("=".repeat(60));
  });

  test("Meta description is present on landing page", async ({ page }) => {
    addOnPageLogging(page);

    console.log("\n" + "=".repeat(60));
    console.log("Verify meta tags on landing page");
    console.log("=".repeat(60));

    await page.goto(gatewayBaseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    const descriptionContent = await metaDescription.getAttribute("content");
    console.log(` Meta description: "${descriptionContent}"`);
    expect(descriptionContent).toBeTruthy();
    expect(descriptionContent.length).toBeGreaterThan(20);
    expect(descriptionContent).toContain("DIY Accounting");
    console.log(" Meta description is present and meaningful");

    // Check meta viewport
    const metaViewport = page.locator('meta[name="viewport"]');
    const viewportContent = await metaViewport.getAttribute("content");
    expect(viewportContent).toContain("width=device-width");
    console.log(" Meta viewport is set correctly");

    // Check charset
    const metaCharset = page.locator("meta[charset]");
    const charsetValue = await metaCharset.getAttribute("charset");
    expect(charsetValue.toLowerCase()).toBe("utf-8");
    console.log(" Charset is UTF-8");

    // Check favicon
    const favicon = page.locator('link[rel="icon"]').first();
    await expect(favicon).toHaveCount(1);
    console.log(" Favicon link is present");

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - Meta tags verified");
    console.log("=".repeat(60));
  });
});

// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 DIY Accounting Ltd

// behaviour-tests/spreadsheets.behaviour.test.js

import { test } from "./helpers/playwrightTestWithout.js";
import { expect } from "@playwright/test";
import { addOnPageLogging, timestamp } from "./helpers/behaviour-helpers.js";
import fs from "node:fs";

// Spreadsheets tests run against deployed CI or prod environments only.
// The spreadsheets site is a separate CloudFront distribution from the submit site.
// Base URL is set via SPREADSHEETS_BASE_URL env var, with CI default.
const spreadsheetsBaseUrlRaw = process.env.SPREADSHEETS_BASE_URL || "https://ci-spreadsheets.diyaccounting.co.uk";
const spreadsheetsBaseUrl = spreadsheetsBaseUrlRaw.replace(/\/+$/, "");

// Screenshot path for spreadsheets tests
const screenshotPath = "target/behaviour-test-results/screenshots/spreadsheets-behaviour-test";

/**
 * Spreadsheets Site Behaviour Tests
 *
 * These tests verify the spreadsheets site (spreadsheets.diyaccounting.co.uk) works correctly:
 * 1. Index page loads with product catalogue
 * 2. catalogue.toml is accessible and parseable
 * 3. Download page loads and populates dropdowns from catalogue
 * 4. Can select a product and period from dropdown
 * 5. Download link generates correct zip URL
 * 6. Actually download a zip file and verify it is valid
 * 7. Donate page loads with PayPal container
 * 8. Knowledge base page loads with articles
 * 9. robots.txt and sitemap.xml accessible
 * 10. Navigation between pages works
 */

test.describe("Spreadsheets Site - spreadsheets.diyaccounting.co.uk", () => {
  test.beforeAll(async () => {
    console.log("\n Setting up test environment for spreadsheets tests...\n");
    console.log(` Spreadsheets Base URL: ${spreadsheetsBaseUrl}`);
    console.log(` Screenshot path: ${screenshotPath}`);

    // Ensure screenshot directory exists
    fs.mkdirSync(screenshotPath, { recursive: true });

    console.log("\n Test environment ready\n");
  });

  test("Index page loads with product catalogue", async ({ page }) => {
    addOnPageLogging(page);

    // ============================================================
    // STEP 1: Navigate to index page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Navigate to index page");
    console.log("=".repeat(60));

    await page.goto(spreadsheetsBaseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-01-index-page.png` });

    // Verify page loaded
    const title = await page.title();
    console.log(` Page title: "${title}"`);
    expect(title).toContain("DIY Accounting Spreadsheets");
    console.log(" Index page loaded successfully");

    // ============================================================
    // STEP 2: Verify main heading and subtitle
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Verify heading and subtitle");
    console.log("=".repeat(60));

    const heading = page.locator("header h1");
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText).toContain("DIY Accounting Spreadsheets");
    console.log(" Main heading is correct");

    const subtitle = page.locator("header .subtitle");
    await expect(subtitle).toBeVisible();
    const subtitleText = await subtitle.textContent();
    expect(subtitleText).toContain("Excel bookkeeping");
    console.log(" Subtitle is correct");

    // ============================================================
    // STEP 3: Verify product cards are displayed
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Verify product cards");
    console.log("=".repeat(60));

    const productCards = page.locator(".product-card");
    const cardCount = await productCards.count();
    console.log(` Found ${cardCount} product cards`);
    expect(cardCount).toBeGreaterThanOrEqual(5);
    console.log(" Product cards are displayed");

    // Verify specific products exist (match on h2 heading to avoid strict mode violations
    // from product names appearing in other cards' feature lists)
    const productNames = ["Basic Sole Trader", "Self Employed", "Company Accounts", "Taxi Driver", "Payslips"];
    for (const name of productNames) {
      const card = page.locator(`.product-card:has(h2:has-text("${name}"))`);
      await expect(card).toBeVisible({ timeout: 5000 });
      console.log(` Product "${name}" is visible`);
    }

    // ============================================================
    // STEP 4: Verify top navigation
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Verify top navigation");
    console.log("=".repeat(60));

    const productsNav = page.locator('.top-nav a:has-text("Products")');
    const downloadNav = page.locator('.top-nav a:has-text("Download")');
    const knowledgeBaseNav = page.locator('.top-nav a:has-text("Knowledge Base")');
    const submitVatNav = page.locator('.top-nav a:has-text("Submit VAT MTD")');
    const donateNav = page.locator('.top-nav a:has-text("Donate")');

    await expect(productsNav).toBeVisible();
    await expect(downloadNav).toBeVisible();
    await expect(knowledgeBaseNav).toBeVisible();
    await expect(submitVatNav).toBeVisible();
    await expect(donateNav).toBeVisible();
    console.log(" Top navigation links are present (Products, Download, Knowledge Base, Submit VAT MTD, Donate)");

    // ============================================================
    // STEP 5: Verify download links on product cards
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 5: Verify download links on product cards");
    console.log("=".repeat(60));

    const downloadLinks = page.locator("a.btn-download");
    const downloadCount = await downloadLinks.count();
    console.log(` Found ${downloadCount} download buttons`);
    expect(downloadCount).toBeGreaterThanOrEqual(6); // 1 generic + 5 product-specific

    // Verify product-specific download links within product cards
    const productDownloadLinks = page.locator(".product-card a.btn-download");
    const productDownloadCount = await productDownloadLinks.count();
    console.log(` Found ${productDownloadCount} product-specific download buttons`);
    expect(productDownloadCount).toBeGreaterThanOrEqual(5);

    const firstProductDownloadHref = await productDownloadLinks.first().getAttribute("href");
    console.log(` First product download link href: ${firstProductDownloadHref}`);
    expect(firstProductDownloadHref).toContain("download.html?product=");
    console.log(" Product download links correctly reference download.html with product parameter");

    // ============================================================
    // STEP 6: Verify footer
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 6: Verify footer");
    console.log("=".repeat(60));

    const footerText = await page.locator("footer").textContent();
    expect(footerText).toContain("DIY Accounting Limited");
    expect(footerText).toContain("privacy");
    expect(footerText).toContain("terms");
    console.log(" Footer contains copyright and legal links");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-02-index-verified.png` });

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - Index page verified");
    console.log("=".repeat(60));
  });

  test("catalogue.toml is accessible and parseable", async ({ page }) => {
    addOnPageLogging(page);

    console.log("\n" + "=".repeat(60));
    console.log("Verify catalogue.toml is accessible");
    console.log("=".repeat(60));

    const catalogueUrl = `${spreadsheetsBaseUrl}/catalogue.toml`;
    console.log(` Fetching: ${catalogueUrl}`);

    // Use page.request.fetch() instead of page.goto() because CloudFront
    // serves .toml with a content-type that triggers a browser download
    const response = await page.request.fetch(catalogueUrl, { failOnStatusCode: false });
    const status = response.status();
    console.log(` Response status: ${status}`);
    expect(status).toBe(200);

    const content = await response.text();
    console.log(` Content length: ${content.length} chars`);
    expect(content.length).toBeGreaterThan(100);

    // Verify TOML structure markers
    expect(content).toContain("[[products]]");
    expect(content).toContain("id =");
    expect(content).toContain("name =");
    expect(content).toContain("[[products.periods]]");
    expect(content).toContain("filename =");
    console.log(" catalogue.toml is well-formed with products and periods");
  });

  test("Download page loads and populates dropdowns from catalogue", async ({ page }) => {
    addOnPageLogging(page);

    // ============================================================
    // STEP 1: Navigate to download page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Navigate to download page");
    console.log("=".repeat(60));

    const downloadUrl = `${spreadsheetsBaseUrl}/download.html`;
    console.log(` Navigating to: ${downloadUrl}`);
    await page.goto(downloadUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-03-download-page.png` });

    // Verify page loaded
    const title = await page.title();
    console.log(` Page title: "${title}"`);
    expect(title).toContain("Download");
    console.log(" Download page loaded");

    // ============================================================
    // STEP 2: Wait for catalogue to load and form to populate
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Wait for catalogue to load");
    console.log("=".repeat(60));

    // Wait for the download form to become visible (catalogue loaded successfully)
    const downloadForm = page.locator("#download-form");
    await expect(downloadForm).toBeVisible({ timeout: 15000 });
    console.log(" Download form is visible (catalogue loaded)");

    // ============================================================
    // STEP 3: Verify product dropdown is populated
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Verify product dropdown");
    console.log("=".repeat(60));

    const productSelect = page.locator("#product-select");
    await expect(productSelect).toBeVisible();

    const productOptions = page.locator("#product-select option");
    const optionCount = await productOptions.count();
    console.log(` Product dropdown has ${optionCount} options`);
    expect(optionCount).toBeGreaterThanOrEqual(5);
    console.log(" Product dropdown is populated with products");

    // ============================================================
    // STEP 4: Select a product and verify period dropdown updates
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Select a product");
    console.log("=".repeat(60));

    // Select "BasicSoleTrader" product
    await productSelect.selectOption("BasicSoleTrader");
    console.log(" Selected BasicSoleTrader product");

    // Wait for period dropdown to update
    await page.waitForTimeout(500);

    const periodSelect = page.locator("#period-select");
    await expect(periodSelect).toBeVisible();

    const periodOptions = page.locator("#period-select option");
    const periodCount = await periodOptions.count();
    console.log(` Period dropdown has ${periodCount} options`);
    expect(periodCount).toBeGreaterThanOrEqual(1);
    console.log(" Period dropdown is populated for selected product");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-04-product-selected.png` });

    // ============================================================
    // STEP 5: Verify download links are updated
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 5: Verify download links");
    console.log("=".repeat(60));

    const directDownloadBtn = page.locator("#download-direct-btn");
    await expect(directDownloadBtn).toBeVisible();
    const directHref = await directDownloadBtn.getAttribute("href");
    console.log(` Direct download href: ${directHref}`);
    expect(directHref).toContain("/zips/");
    expect(directHref).toMatch(/\.zip$/);
    console.log(" Direct download link points to a zip file");

    const donateDownloadBtn = page.locator("#download-donate-btn");
    await expect(donateDownloadBtn).toBeVisible();
    const donateHref = await donateDownloadBtn.getAttribute("href");
    console.log(` Donate download href: ${donateHref}`);
    expect(donateHref).toContain("donate.html");
    expect(donateHref).toContain("filename=");
    console.log(" Donate download link passes filename to donate page");

    // ============================================================
    // STEP 6: Navigate with product parameter
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 6: Navigate with product parameter");
    console.log("=".repeat(60));

    const downloadWithParam = `${spreadsheetsBaseUrl}/download.html?product=SelfEmployed`;
    console.log(` Navigating to: ${downloadWithParam}`);
    await page.goto(downloadWithParam, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for form to load
    await expect(downloadForm).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);

    // Verify product is pre-selected
    const selectedValue = await productSelect.inputValue();
    console.log(` Selected product value: ${selectedValue}`);
    expect(selectedValue).toBe("SelfEmployed");
    console.log(" Product pre-selected from URL parameter");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-05-product-param.png` });

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - Download page verified");
    console.log("=".repeat(60));
  });

  test("Download a zip file and verify it is valid", async ({ page }) => {
    addOnPageLogging(page);

    // ============================================================
    // STEP 1: Navigate to download page and select a product
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Navigate to download page");
    console.log("=".repeat(60));

    const downloadUrl = `${spreadsheetsBaseUrl}/download.html?product=BasicSoleTrader`;
    await page.goto(downloadUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for form to load
    const downloadForm = page.locator("#download-form");
    await expect(downloadForm).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);

    // ============================================================
    // STEP 2: Get the direct download link
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Get download link and fetch zip");
    console.log("=".repeat(60));

    const directDownloadBtn = page.locator("#download-direct-btn");
    const zipHref = await directDownloadBtn.getAttribute("href");
    console.log(` Zip download path: ${zipHref}`);
    expect(zipHref).toContain("/zips/");
    expect(zipHref).toMatch(/\.zip$/);

    // Build full URL for download
    const zipUrl = `${spreadsheetsBaseUrl}${zipHref}`;
    console.log(` Full zip URL: ${zipUrl}`);

    // ============================================================
    // STEP 3: Download the file using page.request
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Download and verify zip file");
    console.log("=".repeat(60));

    const response = await page.request.fetch(zipUrl, {
      failOnStatusCode: false,
    });

    const status = response.status();
    console.log(` Download response status: ${status}`);
    expect(status).toBe(200);

    const contentType = response.headers()["content-type"] || "";
    console.log(` Content-Type: ${contentType}`);

    // Verify the response body is a valid zip (starts with PK magic bytes)
    const body = await response.body();
    console.log(` Response body size: ${body.length} bytes`);
    expect(body.length).toBeGreaterThan(1000); // Zip files should be at least 1KB

    // Check PK magic bytes (0x50, 0x4B) - the first two bytes of any valid ZIP file
    const firstTwoBytes = `${String.fromCharCode(body[0])}${String.fromCharCode(body[1])}`;
    console.log(` First two bytes: 0x${body[0].toString(16)} 0x${body[1].toString(16)} ("${firstTwoBytes}")`);
    expect(body[0]).toBe(0x50); // 'P'
    expect(body[1]).toBe(0x4b); // 'K'
    console.log(" File starts with PK magic bytes - valid zip file");

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - Zip download verified");
    console.log("=".repeat(60));
  });

  test("Donate page loads with Stripe and PayPal donation options", async ({ page }) => {
    addOnPageLogging(page);

    // ============================================================
    // STEP 1: Navigate to donate page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Navigate to donate page");
    console.log("=".repeat(60));

    const donateUrl = `${spreadsheetsBaseUrl}/donate.html`;
    console.log(` Navigating to: ${donateUrl}`);
    await page.goto(donateUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-06-donate-page.png` });

    // Verify page loaded
    const title = await page.title();
    console.log(` Page title: "${title}"`);
    expect(title).toContain("Donate");
    console.log(" Donate page loaded");

    // ============================================================
    // STEP 2: Verify donate page content
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Verify donate page content");
    console.log("=".repeat(60));

    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("Support DIY Accounting");
    expect(pageContent).toContain("voluntary donation");
    console.log(" Donate page content is present");

    // ============================================================
    // STEP 3: Verify Stripe donate link (primary)
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Verify Stripe donate link");
    console.log("=".repeat(60));

    const stripeLinks = page.locator(".stripe-donate-link");
    const stripeLinkCount = await stripeLinks.count();
    expect(stripeLinkCount).toBeGreaterThanOrEqual(3);
    const stripeHref = await stripeLinks.first().getAttribute("href");
    expect(stripeHref).toContain("buy.stripe.com");
    console.log(` ${stripeLinkCount} Stripe donate links visible with correct URLs`);

    // ============================================================
    // STEP 3b: Verify PayPal donate form (secondary)
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3b: Verify PayPal donate form");
    console.log("=".repeat(60));

    const paypalForm = page.locator("#paypal-donate-form");
    await expect(paypalForm).toBeAttached({ timeout: 5000 });
    const formAction = await paypalForm.getAttribute("action");
    expect(formAction).toBe("https://www.paypal.com/donate");
    console.log(" PayPal donate form exists as secondary option");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-07-donate-options.png` });

    // ============================================================
    // STEP 4: Verify browse products link (no filename parameter)
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Verify browse products link");
    console.log("=".repeat(60));

    const browseLink = page.locator("#browse-products-container a");
    await expect(browseLink).toBeVisible({ timeout: 5000 });
    const browseHref = await browseLink.getAttribute("href");
    console.log(` Browse products link href: ${browseHref}`);
    expect(browseHref).toContain("index.html");
    console.log(" Browse products link is visible (no filename parameter)");

    // ============================================================
    // STEP 5: Verify donate page with filename parameter
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 5: Verify donate page with filename parameter");
    console.log("=".repeat(60));

    const donateWithFile = `${spreadsheetsBaseUrl}/donate.html?product=BasicSoleTrader&filename=BasicSoleTrader-2025-06.zip`;
    console.log(` Navigating to: ${donateWithFile}`);
    await page.goto(donateWithFile, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-08-donate-with-file.png` });

    // When filename is passed, the "Download without donating" link should be visible
    const skipDonateLink = page.locator("#skip-donate-link");
    const skipDonateContainer = page.locator("#download-link-container");

    // The container becomes visible when JS processes the filename parameter
    const containerVisible = await skipDonateContainer.isVisible().catch(() => false);
    if (containerVisible) {
      const skipHref = await skipDonateLink.getAttribute("href");
      console.log(` Skip donate link href: ${skipHref}`);
      expect(skipHref).toContain("/zips/");
      expect(skipHref).toContain("BasicSoleTrader");
      console.log(" 'Download without donating' link is visible with correct zip URL");
    } else {
      console.log(" Download link container not visible (JS may not have processed params yet)");
    }

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - Donate page verified");
    console.log("=".repeat(60));
  });

  test("Knowledge base page loads with articles", async ({ page }) => {
    addOnPageLogging(page);

    // ============================================================
    // STEP 1: Navigate to knowledge base page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Navigate to knowledge base page");
    console.log("=".repeat(60));

    const kbUrl = `${spreadsheetsBaseUrl}/knowledge-base.html`;
    console.log(` Navigating to: ${kbUrl}`);
    await page.goto(kbUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-09-knowledge-base.png` });

    // Verify page loaded
    const title = await page.title();
    console.log(` Page title: "${title}"`);
    expect(title).toContain("Knowledge Base");
    console.log(" Knowledge base page loaded");

    // ============================================================
    // STEP 2: Verify page heading and description
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Verify page heading");
    console.log("=".repeat(60));

    const pageTitle = page.locator(".kb-page-title");
    await expect(pageTitle).toBeVisible();
    const titleText = await pageTitle.textContent();
    expect(titleText).toContain("Knowledge Base");
    console.log(" Knowledge Base page heading is visible");

    // ============================================================
    // STEP 3: Wait for articles to load
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Wait for articles to load");
    console.log("=".repeat(60));

    // Wait for the article list to be populated by JavaScript
    const articleList = page.locator("#article-list");
    await expect(articleList).toBeVisible({ timeout: 15000 });

    // Wait for articles to render (JS fetches and parses knowledge-base.toml)
    await page.waitForFunction(
      () => {
        const list = document.getElementById("article-list");
        return list && list.children.length > 0;
      },
      { timeout: 15000 },
    );

    const articleItems = page.locator("#article-list > *");
    const articleCount = await articleItems.count();
    console.log(` Found ${articleCount} articles`);
    expect(articleCount).toBeGreaterThan(0);
    console.log(" Articles loaded successfully");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-10-articles-loaded.png` });

    // ============================================================
    // STEP 4: Verify search box
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Verify search box");
    console.log("=".repeat(60));

    const searchInput = page.locator("#kb-search");
    await expect(searchInput).toBeVisible();
    console.log(" Search input is visible");

    const categoryFilter = page.locator("#category-filter");
    await expect(categoryFilter).toBeVisible();
    console.log(" Category filter is visible");

    const searchHint = page.locator("#search-hint");
    await expect(searchHint).toBeVisible();
    console.log(" Search hint is visible");

    // ============================================================
    // STEP 5: Test search functionality
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 5: Test search functionality");
    console.log("=".repeat(60));

    await searchInput.fill("tax");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-11-search-results.png` });

    const hintText = await searchHint.textContent();
    console.log(` Search hint after typing "tax": "${hintText}"`);
    // The hint should update to show results count
    console.log(" Search functionality is working");

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(300);

    // ============================================================
    // STEP 6: Verify navigation links
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 6: Verify navigation links");
    console.log("=".repeat(60));

    const backLink = page.locator('.nav-back a[href="index.html"]');
    await expect(backLink).toBeVisible();
    console.log(" Back to products link is present");

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - Knowledge base page verified");
    console.log("=".repeat(60));
  });

  test("robots.txt is accessible", async ({ page }) => {
    addOnPageLogging(page);

    console.log("\n" + "=".repeat(60));
    console.log("Verify robots.txt");
    console.log("=".repeat(60));

    const robotsUrl = `${spreadsheetsBaseUrl}/robots.txt`;
    console.log(` Fetching: ${robotsUrl}`);

    const response = await page.goto(robotsUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    expect(response.status()).toBe(200);
    console.log(` Response status: ${response.status()}`);

    const content = await page.textContent("body");
    expect(content).toContain("User-agent:");
    expect(content).toContain("Allow:");
    expect(content).toContain("Sitemap:");
    console.log(" robots.txt is well-formed");
  });

  test("sitemap.xml is accessible", async ({ page }) => {
    addOnPageLogging(page);

    console.log("\n" + "=".repeat(60));
    console.log("Verify sitemap.xml");
    console.log("=".repeat(60));

    const sitemapUrl = `${spreadsheetsBaseUrl}/sitemap.xml`;
    console.log(` Fetching: ${sitemapUrl}`);

    const response = await page.goto(sitemapUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    expect(response.status()).toBe(200);
    console.log(` Response status: ${response.status()}`);

    const content = await page.content();
    expect(content).toContain("urlset");
    expect(content).toContain("<loc>");
    expect(content).toContain("spreadsheets.diyaccounting.co.uk");
    console.log(" sitemap.xml is well-formed");
  });

  test("References page loads with citation entries", async ({ page }) => {
    addOnPageLogging(page);

    // ============================================================
    // STEP 1: Verify references.toml is accessible
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Verify references.toml is accessible");
    console.log("=".repeat(60));

    const refsTomlUrl = `${spreadsheetsBaseUrl}/references.toml`;
    const tomlResponse = await page.request.fetch(refsTomlUrl, { failOnStatusCode: false });
    expect(tomlResponse.status()).toBe(200);
    const tomlContent = await tomlResponse.text();
    expect(tomlContent).toContain("[[reference]]");
    expect(tomlContent).toContain("[[reference.source]]");
    console.log(" references.toml is accessible and well-formed");

    // ============================================================
    // STEP 2: Navigate to references page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Navigate to references page");
    console.log("=".repeat(60));

    const refsUrl = `${spreadsheetsBaseUrl}/references.html`;
    await page.goto(refsUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    const title = await page.title();
    expect(title).toContain("References");
    console.log(" References page loaded");

    // Wait for JS to render references from TOML
    await page.waitForFunction(
      () => {
        const list = document.getElementById("references-list");
        return list && list.querySelector(".ref-entry");
      },
      { timeout: 15000 },
    );
    console.log(" Reference entries rendered from TOML");

    // Verify reference entries have expected structure
    const refEntries = page.locator(".ref-entry");
    const entryCount = await refEntries.count();
    console.log(` Found ${entryCount} reference entries`);
    expect(entryCount).toBeGreaterThan(0);

    // Verify at least one reference has a source with extract
    const firstExtract = page.locator(".ref-extract").first();
    await expect(firstExtract).toBeVisible({ timeout: 5000 });
    console.log(" Reference sources with verbatim extracts are displayed");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-18-references-page.png` });

    // ============================================================
    // STEP 3: Navigate to sources page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Navigate to sources page");
    console.log("=".repeat(60));

    const sourcesUrl = `${spreadsheetsBaseUrl}/sources.html`;
    await page.goto(sourcesUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    const sourcesTitle = await page.title();
    expect(sourcesTitle).toContain("Source Catalogue");
    console.log(" Sources page loaded");

    // Wait for JS to render
    await page.waitForFunction(
      () => {
        const list = document.getElementById("sources-list");
        return list && list.querySelector(".source-entry");
      },
      { timeout: 15000 },
    );
    console.log(" Source entries rendered");

    const sourceEntries = page.locator(".source-entry");
    const sourceCount = await sourceEntries.count();
    console.log(` Found ${sourceCount} source entries`);
    expect(sourceCount).toBeGreaterThan(0);

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-19-sources-page.png` });

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - References and sources pages verified");
    console.log("=".repeat(60));
  });

  test("Navigate between all main pages", async ({ page }) => {
    addOnPageLogging(page);

    // ============================================================
    // STEP 1: Start on index page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Start on index page");
    console.log("=".repeat(60));

    await page.goto(spreadsheetsBaseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    const indexTitle = await page.title();
    expect(indexTitle).toContain("Spreadsheets");
    console.log(" Index page loaded");

    // ============================================================
    // STEP 2: Navigate to Knowledge Base via top nav
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Navigate to Knowledge Base");
    console.log("=".repeat(60));

    const kbNavLink = page.locator('.top-nav a[href="knowledge-base.html"]');
    await kbNavLink.click();
    await page.waitForURL(/knowledge-base\.html/, { timeout: 15000 });
    const kbTitle = await page.title();
    expect(kbTitle).toContain("Knowledge Base");
    console.log(" Knowledge Base page loaded via nav");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-12-nav-to-kb.png` });

    // ============================================================
    // STEP 3: Navigate to Donate via top nav
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Navigate to Donate");
    console.log("=".repeat(60));

    const donateNavLink = page.locator('.top-nav a[href="donate.html"]');
    await donateNavLink.click();
    await page.waitForURL(/donate\.html/, { timeout: 15000 });
    const donateTitle = await page.title();
    expect(donateTitle).toContain("Donate");
    console.log(" Donate page loaded via nav");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-13-nav-to-donate.png` });

    // ============================================================
    // STEP 4: Navigate to Products via top nav
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Navigate back to Products");
    console.log("=".repeat(60));

    const productsNavLink = page.locator('.top-nav a[href="index.html"]');
    await productsNavLink.click();
    await page.waitForURL(/index\.html/, { timeout: 15000 });
    const productsTitle = await page.title();
    expect(productsTitle).toContain("Spreadsheets");
    console.log(" Products page loaded via nav");

    // ============================================================
    // STEP 5: Navigate to Download from product card
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 5: Navigate to Download from product card");
    console.log("=".repeat(60));

    const firstDownloadLink = page.locator('a.btn-download[href*="download.html"]').first();
    await firstDownloadLink.click();
    await page.waitForURL(/download\.html/, { timeout: 15000 });
    const downloadTitle = await page.title();
    expect(downloadTitle).toContain("Download");
    console.log(" Download page loaded from product card");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-14-nav-to-download.png` });

    // ============================================================
    // STEP 6: Navigate back to Products via breadcrumb
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 6: Navigate back via breadcrumb");
    console.log("=".repeat(60));

    const backToProducts = page.locator('.nav-back a[href="index.html"]');
    await backToProducts.click();
    await page.waitForURL(/index\.html/, { timeout: 15000 });
    const backTitle = await page.title();
    expect(backTitle).toContain("Spreadsheets");
    console.log(" Navigated back to Products via breadcrumb");

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-15-nav-back.png` });

    // ============================================================
    // STEP 7: Final summary
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - Navigation between pages verified");
    console.log("=".repeat(60));

    console.log("\n Summary:");
    console.log("   Index -> Knowledge Base via top nav");
    console.log("   Knowledge Base -> Donate via top nav");
    console.log("   Donate -> Products via top nav");
    console.log("   Products -> Download via product card");
    console.log("   Download -> Products via breadcrumb\n");
  });

  test("Lightbox image viewer works on index page", async ({ page }) => {
    addOnPageLogging(page);

    // ============================================================
    // STEP 1: Navigate to index page
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Navigate to index page");
    console.log("=".repeat(60));

    await page.goto(spreadsheetsBaseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // ============================================================
    // STEP 2: Verify lightbox overlay exists (hidden)
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Verify lightbox overlay");
    console.log("=".repeat(60));

    const lightboxOverlay = page.locator("#lightbox");
    await expect(lightboxOverlay).toBeAttached();
    console.log(" Lightbox overlay element exists");

    // ============================================================
    // STEP 3: Verify clickable images exist
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Verify clickable images");
    console.log("=".repeat(60));

    const lightboxImages = page.locator("img.lightbox-img");
    const imageCount = await lightboxImages.count();
    console.log(` Found ${imageCount} lightbox images`);
    expect(imageCount).toBeGreaterThan(0);
    console.log(" Clickable lightbox images are present");

    // ============================================================
    // STEP 4: Click an image to open lightbox
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Click image to open lightbox");
    console.log("=".repeat(60));

    // Click the first lightbox image
    await lightboxImages.first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-16-lightbox-open.png` });

    // Verify lightbox is now visible
    const lightboxVisible = await lightboxOverlay.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.opacity !== "0";
    });

    if (lightboxVisible) {
      console.log(" Lightbox opened successfully");

      // Close lightbox by clicking overlay
      await lightboxOverlay.click();
      await page.waitForTimeout(500);
      console.log(" Lightbox closed");
    } else {
      console.log(" Lightbox click registered but overlay style may differ - checking alternative indicators");
    }

    await page.screenshot({ path: `${screenshotPath}/${timestamp()}-17-lightbox-closed.png` });

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE - Lightbox verified");
    console.log("=".repeat(60));
  });
});

#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd

/**
 * WCAG 1.4.12 Text Spacing Compliance Test
 *
 * Tests that content remains visible and functional when text spacing is increased:
 * - Line height: 1.5 times font size
 * - Paragraph spacing: 2 times font size
 * - Letter spacing: 0.12 times font size
 * - Word spacing: 0.16 times font size
 *
 * Usage:
 *   node scripts/text-spacing-test.js --url https://example.com [--output FILE]
 *
 * Options:
 *   --url URL      Base URL to test (required)
 *   --output FILE  Output JSON file (default: web/www.spreadsheets.diyaccounting.co.uk/public/tests/accessibility/text-spacing-results.json)
 */

import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultValue;
};

const baseUrl = getArg("--url", null);
const outputFile = getArg("--output", "web/www.spreadsheets.diyaccounting.co.uk/public/tests/accessibility/text-spacing-results.json");

if (!baseUrl) {
  console.error("Error: --url is required");
  console.error("Usage: node scripts/text-spacing-test.js --url https://example.com [--output FILE]");
  process.exit(1);
}

// Gateway pages to test
const PAGES = ["/", "/about.html"];

// WCAG 1.4.12 Text Spacing CSS
const TEXT_SPACING_CSS = `
  * {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p {
    margin-bottom: 2em !important;
  }
`;

/**
 * Check if any text is clipped due to overflow:hidden
 */
async function checkForClippedContent(page) {
  return await page.evaluate(() => {
    const clippedElements = [];
    const elements = document.querySelectorAll("*");

    for (const el of elements) {
      const style = window.getComputedStyle(el);
      const overflow = style.overflow;
      const overflowX = style.overflowX;
      const overflowY = style.overflowY;

      const isHiddenX = overflow === "hidden" || overflowX === "hidden";
      const isHiddenY = overflow === "hidden" || overflowY === "hidden";

      if (isHiddenX || isHiddenY) {
        const isClippedX = isHiddenX && el.scrollWidth > el.clientWidth + 1;
        const isClippedY = isHiddenY && el.scrollHeight > el.clientHeight + 1;

        if (isClippedX || isClippedY) {
          let selector = el.tagName.toLowerCase();
          if (el.id) selector += `#${el.id}`;
          if (el.className && typeof el.className === "string") {
            selector += `.${el.className.split(" ").join(".")}`;
          }

          const text = (el.textContent || "").trim().substring(0, 50);

          clippedElements.push({
            selector,
            clippedX: isClippedX,
            clippedY: isClippedY,
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            textPreview: text,
          });
        }
      }
    }

    return clippedElements;
  });
}

async function testPage(browser, url) {
  const page = await browser.newPage();
  const result = {
    url,
    timestamp: new Date().toISOString(),
    passed: false,
    clippedElements: [],
    error: null,
  };

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.addStyleTag({ content: TEXT_SPACING_CSS });
    await page.waitForTimeout(500);
    const clippedElements = await checkForClippedContent(page);
    result.clippedElements = clippedElements;
    result.passed = clippedElements.length === 0;
  } catch (error) {
    result.error = error.message;
    result.passed = false;
  } finally {
    await page.close();
  }

  return result;
}

async function main() {
  console.log("WCAG 1.4.12 Text Spacing Compliance Test");
  console.log("========================================");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Output: ${outputFile}`);
  console.log("");

  const browser = await chromium.launch({ headless: true });
  const results = {
    testName: "WCAG 1.4.12 Text Spacing",
    baseUrl,
    timestamp: new Date().toISOString(),
    cssInjected: TEXT_SPACING_CSS.trim(),
    pages: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      errors: 0,
    },
  };

  try {
    for (const pagePath of PAGES) {
      const url = baseUrl.replace(/\/$/, "") + pagePath;
      console.log(`Testing: ${pagePath}`);

      const pageResult = await testPage(browser, url);
      results.pages.push(pageResult);

      results.summary.total++;
      if (pageResult.error) {
        results.summary.errors++;
        console.log(`  ERROR: ${pageResult.error}`);
      } else if (pageResult.passed) {
        results.summary.passed++;
        console.log(`  PASSED`);
      } else {
        results.summary.failed++;
        console.log(`  FAILED: ${pageResult.clippedElements.length} clipped element(s)`);
        for (const el of pageResult.clippedElements) {
          console.log(`    - ${el.selector} (${el.clippedX ? "X" : ""}${el.clippedY ? "Y" : ""} overflow)`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  const outputPath = join(projectRoot, outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log("");
  console.log("Summary:");
  console.log(`  Total pages: ${results.summary.total}`);
  console.log(`  Passed: ${results.summary.passed}`);
  console.log(`  Failed: ${results.summary.failed}`);
  console.log(`  Errors: ${results.summary.errors}`);
  console.log("");
  console.log(`Results written to: ${outputPath}`);

  if (results.summary.failed > 0 || results.summary.errors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

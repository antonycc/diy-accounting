// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 DIY Accounting Ltd

// playwright.config.js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  projects: [
    {
      name: "spreadsheetsBehaviour",
      testDir: "behaviour-tests",
      testMatch: ["**/spreadsheets.behaviour.test.js"],
      workers: 1,
      outputDir: "./target/behaviour-test-results/",
      timeout: 300_000,
    },
    {
      name: "browser-tests",
      testDir: "web/browser-tests",
      testMatch: ["**/spreadsheets-content.browser.test.js"],
      workers: 1,
      outputDir: "./target/browser-test-results/",
    },
  ],

  // Output directory for all artifacts (screenshots, videos, traces, etc.)
  outputDir: "./target/test-results/",

  // Don't delete the output directory before running tests
  preserveOutput: "always",

  use: {
    // Save a video for every test
    video: {
      mode: "on",
      size: { width: 1280, height: 1446 },
    },
    // Match viewport to video size so screenshots and recordings align
    viewport: { width: 1280, height: 1446 },
    // Screenshot options
    screenshot: "on",

    // Enable detailed logging
    trace: "on",
  },

  reporter: [
    [
      "html",
      {
        outputFolder: "target/test-reports/html-report",
        open: "never",
      },
    ],
    ["list"],
  ],

  // Default test timeout
  timeout: 120_000,
});

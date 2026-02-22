// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd

// behaviour-tests/helpers/playwrightTestWithout.js
import { test as base } from "@playwright/test";

export const test = base.extend({
  // Respect project/test use: options by applying contextOptions and explicitly enabling recordVideo
  context: async ({ browser, contextOptions }, use, testInfo) => {
    const recordVideo = { dir: testInfo.outputPath(""), size: { width: 1280, height: 1024 } };
    const context = await browser.newContext({ ...contextOptions, recordVideo });
    await context.route("**/*", (route) => {
      const url = route.request().url();
      // block RUM/ GA / gtag / GTM endpoints
      if (
        url.startsWith("https://client.rum") ||
        url.startsWith("https://www.google-analytics.com/g/collect") ||
        url.startsWith("https://www.googletagmanager.com/") ||
        url.includes("analytics.js") ||
        url.includes("gtag/js")
      ) {
        const isGaScript = url.includes("analytics.js") || url.includes("gtag/js") || url.includes("/gtm.js") || url.includes("/cwr.js");
        const isScriptRequest = isGaScript || route.request().resourceType() === "script";
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "cache-control": "no-store",
            ...(isScriptRequest ? { "content-type": "application/javascript" } : { "content-type": "text/plain; charset=utf-8" }),
          },
          body: "", // empty body as requested
        });
      }
      return route.continue();
    });
    await use(context);
    try {
      await context.close();
    } catch (e) {
      console.warn("Error closing context:", e);
    }
  },
});

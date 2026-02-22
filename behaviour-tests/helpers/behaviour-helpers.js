// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd

// behaviour-tests/helpers/behaviour-helpers.js
// Minimal helper for spreadsheets behaviour tests (addOnPageLogging + timestamp)

export function addOnPageLogging(page) {
  // Capture browser console and page errors
  page.on("console", (msg) => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
  });

  page.on("pageerror", (error) => {
    console.log(`[BROWSER ERROR]: ${error.message}`);
  });

  // Always log failed requests — important for diagnosing errors
  page.on("requestfailed", (request) => {
    console.log(`[HTTP REQUEST FAILED] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });
}

// Generate timestamp for file naming
export function timestamp() {
  const now = new Date();
  const iso = now.toISOString(); // e.g. 2025-11-08T12:34:56.789Z
  const datePart = iso.slice(0, 10); // YYYY-MM-DD
  const timePart = iso.slice(11, 19); // HH:MM:SS
  const [hour, minute, second] = timePart.split(":");
  const nanos = (process.hrtime.bigint() % 1000000000n).toString().padStart(9, "0");
  return `${datePart}_${hour}-${minute}-${second}-${nanos}`;
}

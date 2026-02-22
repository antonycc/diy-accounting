// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 DIY Accounting Ltd

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const PUBLIC_DIR = join(process.cwd(), "web/spreadsheets.diyaccounting.co.uk/public");

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".toml": "application/toml",
};

let server;
let baseUrl;

beforeAll(async () => {
  server = createServer((req, res) => {
    const urlPath = req.url === "/" ? "/index.html" : req.url;
    const filePath = join(PUBLIC_DIR, urlPath);
    if (!existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(readFileSync(filePath));
  });
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  if (server) server.close();
});

describe("Smoke test — local server renders pages", () => {
  it("index.html returns 200 and contains site name", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("DIY Accounting Spreadsheets");
  });

  it("index.html contains product cards", async () => {
    const res = await fetch(`${baseUrl}/`);
    const html = await res.text();
    expect(html).toContain("product-card");
    expect(html).toContain("download.html?product=");
  });

  it("download.html returns 200", async () => {
    const res = await fetch(`${baseUrl}/download.html`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Download");
  });

  it("donate.html returns 200 and has Stripe links", async () => {
    const res = await fetch(`${baseUrl}/donate.html`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("buy.stripe.com");
    expect(html).toContain("paypal.com/donate");
  });

  it("knowledge-base.html returns 200", async () => {
    const res = await fetch(`${baseUrl}/knowledge-base.html`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Knowledge Base");
  });

  it("non-existent page returns 404", async () => {
    const res = await fetch(`${baseUrl}/does-not-exist.html`);
    expect(res.status).toBe(404);
  });

  it("robots.txt returns 200", async () => {
    const res = await fetch(`${baseUrl}/robots.txt`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("User-agent");
  });

  it("spreadsheets.css returns 200", async () => {
    const res = await fetch(`${baseUrl}/spreadsheets.css`);
    expect(res.status).toBe(200);
  });
});

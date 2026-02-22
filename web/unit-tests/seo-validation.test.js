// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 DIY Accounting Ltd

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Site configuration for the spreadsheets site
const site = {
  dir: path.join(process.cwd(), "web/spreadsheets.diyaccounting.co.uk/public"),
  domain: "https://spreadsheets.diyaccounting.co.uk",
};

// Helper: read file content
function readFile(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}

// Helper: extract URLs from sitemap XML
function extractSitemapUrls(xml) {
  const urls = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

// Helper: parse robots.txt directives
function parseRobotsTxt(content) {
  const lines = content.split("\n").map((l) => l.trim());
  const directives = { userAgents: [], allows: [], disallows: [], sitemaps: [] };
  for (const line of lines) {
    if (line.startsWith("#") || line === "") continue;
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    const keyLower = key.toLowerCase().trim();
    if (keyLower === "user-agent") directives.userAgents.push(value);
    else if (keyLower === "allow") directives.allows.push(value);
    else if (keyLower === "disallow") directives.disallows.push(value);
    else if (keyLower === "sitemap") directives.sitemaps.push(value);
  }
  return directives;
}

// Helper: check if a path is disallowed by robots.txt rules
function isDisallowed(urlPath, disallows) {
  return disallows.some((rule) => urlPath.startsWith(rule));
}

// Helper: extract JSON-LD from HTML
function extractJsonLd(html) {
  const blocks = [];
  const regex = /<script\s+type\s*=\s*"application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // skip invalid JSON
    }
  }
  return blocks;
}

describe("Sitemap validation", () => {
  const sitemapPath = path.join(site.dir, "sitemap.xml");

  it("sitemap.xml exists and is valid XML", () => {
    expect(fs.existsSync(sitemapPath), `${sitemapPath} should exist`).toBe(true);
    const xml = readFile(sitemapPath);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
  });

  it("all sitemap URLs use the correct domain", () => {
    const xml = readFile(sitemapPath);
    const urls = extractSitemapUrls(xml);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url, `URL ${url} should start with ${site.domain}`).toMatch(new RegExp(`^${site.domain.replace(/\./g, "\\.")}`));
    }
  });

  it("no duplicate URLs in sitemap", () => {
    const xml = readFile(sitemapPath);
    const urls = extractSitemapUrls(xml);
    const unique = new Set(urls);
    expect(unique.size, `Found ${urls.length - unique.size} duplicate URLs`).toBe(urls.length);
  });

  it("no sitemap URLs are blocked by robots.txt", () => {
    const robotsPath = path.join(site.dir, "robots.txt");
    if (!fs.existsSync(robotsPath)) return;
    const robots = parseRobotsTxt(readFile(robotsPath));
    const xml = readFile(sitemapPath);
    const urls = extractSitemapUrls(xml);
    for (const url of urls) {
      const urlPath = new URL(url).pathname;
      expect(isDisallowed(urlPath, robots.disallows), `Sitemap URL ${url} is blocked by robots.txt Disallow rule`).toBe(false);
    }
  });
});

describe("robots.txt validation", () => {
  const robotsPath = path.join(site.dir, "robots.txt");

  it("robots.txt exists", () => {
    expect(fs.existsSync(robotsPath), `${robotsPath} should exist`).toBe(true);
  });

  it("has User-agent: * directive", () => {
    const robots = parseRobotsTxt(readFile(robotsPath));
    expect(robots.userAgents).toContain("*");
  });

  it("has Sitemap directive pointing to correct URL", () => {
    const robots = parseRobotsTxt(readFile(robotsPath));
    const expectedSitemap = `${site.domain}/sitemap.xml`;
    expect(robots.sitemaps, `Should contain ${expectedSitemap}`).toContain(expectedSitemap);
  });
});

describe("Meta tag validation", () => {
  const indexPath = path.join(site.dir, "index.html");

  it("index.html has <title>", () => {
    const html = readFile(indexPath);
    expect(html).toMatch(/<title>.+<\/title>/);
  });

  it('index.html has <meta name="description">', () => {
    const html = readFile(indexPath);
    expect(html).toMatch(/name\s*=\s*"description"/);
  });

  // Check all HTML pages in the site have <title>
  const htmlFiles = fs.readdirSync(site.dir).filter((f) => f.endsWith(".html"));
  for (const file of htmlFiles) {
    it(`${file} has <title>`, () => {
      const html = readFile(path.join(site.dir, file));
      expect(html, `${file} should have a <title> tag`).toMatch(/<title>.+<\/title>/);
    });
  }
});

describe("Structured data validation", () => {
  it('index.html has JSON-LD with @type "SoftwareApplication"', () => {
    const html = readFile(path.join(site.dir, "index.html"));
    const jsonLdBlocks = extractJsonLd(html);
    expect(jsonLdBlocks.length).toBeGreaterThan(0);
    const app = jsonLdBlocks.find((b) => b["@type"] === "SoftwareApplication");
    expect(app, "Should have a SoftwareApplication JSON-LD block").toBeTruthy();
    expect(app["@context"]).toBe("https://schema.org");
    expect(app.name).toContain("DIY Accounting");
  });
});

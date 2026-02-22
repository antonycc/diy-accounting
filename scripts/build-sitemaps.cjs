#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 DIY Accounting Ltd
//
// build-sitemaps.cjs — Generate sitemap.xml for spreadsheets site
//
// Usage:
//   node scripts/build-sitemaps.cjs
//
// Reads:  web/spreadsheets.diyaccounting.co.uk/public/knowledge-base.toml
//         web/spreadsheets.diyaccounting.co.uk/public/catalogue.toml
// Writes: web/spreadsheets.diyaccounting.co.uk/public/sitemap.xml

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const KB_TOML = path.join(ROOT, "web", "spreadsheets.diyaccounting.co.uk", "public", "knowledge-base.toml");
const CATALOGUE_TOML = path.join(ROOT, "web", "spreadsheets.diyaccounting.co.uk", "public", "catalogue.toml");
const SPREADSHEETS_SITEMAP = path.join(ROOT, "web", "spreadsheets.diyaccounting.co.uk", "public", "sitemap.xml");

// Minimal TOML parser (same as build-gateway-redirects.cjs)
function parseTOML(src) {
  var res = {};
  var currentSection = res;
  var lines = src.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[[")) {
      var name = line.substring(2, line.lastIndexOf("]]")).trim();
      if (!res[name]) res[name] = [];
      var entry = {};
      res[name].push(entry);
      currentSection = entry;
      continue;
    }
    if (line.startsWith("[")) {
      var tname = line.substring(1, line.lastIndexOf("]")).trim();
      if (!res[tname]) res[tname] = {};
      currentSection = res[tname];
      continue;
    }
    var eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    var key = line.substring(0, eqIdx).trim();
    var val = line.substring(eqIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
    else if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (val.startsWith("[") && val.endsWith("]")) {
      var inner = val.substring(1, val.length - 1).trim();
      val = inner
        ? inner.split(",").map(function (v) {
            v = v.trim();
            return v.startsWith('"') && v.endsWith('"') ? v.substring(1, v.length - 1) : v;
          })
        : [];
    } else if (!isNaN(val) && val !== "") val = Number(val);
    currentSection[key] = val;
  }
  return res;
}

// Read knowledge base articles
var articles = [];
if (fs.existsSync(KB_TOML)) {
  var kb = parseTOML(fs.readFileSync(KB_TOML, "utf8"));
  articles = kb.article || [];
}

// Read catalogue products
var products = [];
if (fs.existsSync(CATALOGUE_TOML)) {
  var cat = parseTOML(fs.readFileSync(CATALOGUE_TOML, "utf8"));
  products = cat.products || [];
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// === Generate spreadsheets sitemap.xml ===
var sp = [];
sp.push('<?xml version="1.0" encoding="UTF-8"?>');
sp.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

// Main pages
sp.push("  <url><loc>https://spreadsheets.diyaccounting.co.uk/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>");
sp.push(
  "  <url><loc>https://spreadsheets.diyaccounting.co.uk/download.html</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>",
);
sp.push(
  "  <url><loc>https://spreadsheets.diyaccounting.co.uk/donate.html</loc><changefreq>yearly</changefreq><priority>0.5</priority></url>",
);
sp.push(
  "  <url><loc>https://spreadsheets.diyaccounting.co.uk/knowledge-base.html</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>",
);

// Product download pages
for (var prod of products) {
  sp.push(
    "  <url><loc>https://spreadsheets.diyaccounting.co.uk/download.html?product=" +
      escapeXml(prod.id) +
      "</loc><priority>0.9</priority></url>",
  );
}

// Knowledge base articles
for (var art of articles) {
  sp.push("  <url><loc>https://spreadsheets.diyaccounting.co.uk/articles/" + escapeXml(art.id) + ".md</loc><priority>0.7</priority></url>");
}

sp.push("</urlset>");
sp.push("");

fs.writeFileSync(SPREADSHEETS_SITEMAP, sp.join("\n"), "utf8");
console.log("Spreadsheets sitemap: " + SPREADSHEETS_SITEMAP + " (" + (sp.length - 3) + " URLs)");

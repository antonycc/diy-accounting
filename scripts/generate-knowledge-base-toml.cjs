#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 DIY Accounting Ltd

/**
 * Generates knowledge-base.toml from the diy-accounting-mdcms content directory.
 * Reads all *Article.md files, extracts metadata, converts HTML to markdown,
 * categorises articles, and outputs TOML.
 *
 * Usage: node scripts/generate-knowledge-base-toml.js
 */

const fs = require("fs");
const path = require("path");

const CONTENT_DIR = path.resolve(__dirname, "../../diy-accounting-mdcms/content");
const OUTPUT_DIR = path.resolve(__dirname, "../web/spreadsheets.diyaccounting.co.uk/public");
const OUTPUT_TOML = path.join(OUTPUT_DIR, "knowledge-base.toml");
const ARTICLES_DIR = path.join(OUTPUT_DIR, "articles");

/**
 * Parse the mdcms markdown format into an object.
 * Format: # fieldName\nvalue\n\n# nextField\n...
 */
function parseMdcms(content) {
  const result = {};
  const sections = content.split(/^# /m);

  for (const section of sections) {
    if (!section.trim()) continue;
    const newlineIdx = section.indexOf("\n");
    if (newlineIdx === -1) continue;
    const key = section.substring(0, newlineIdx).trim();
    const value = section.substring(newlineIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

/**
 * Convert HTML to plain text with basic markdown formatting.
 * Strips tags, converts <strong> to **, <a> to markdown links,
 * <li> to list items, etc.
 */
function htmlToMarkdown(html) {
  if (!html) return "";

  let text = html;

  // Remove images
  text = text.replace(/<img[^>]*>/gi, "");

  // Convert <br> and <br/> to newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Convert <strong>/<b> to **bold**
  text = text.replace(/<(strong|b)>(.*?)<\/\1>/gi, "**$2**");

  // Convert <em>/<i> to *italic*
  text = text.replace(/<(em|i)>(.*?)<\/\1>/gi, "*$2*");

  // Convert <a href="...">text</a> to [text](url)
  // But only keep external links, not internal article/product links
  text = text.replace(/<a\s+href="(https?:\/\/[^"]+)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  // Remove internal links but keep text
  text = text.replace(/<a\s+href="[^"]*"[^>]*>(.*?)<\/a>/gi, "$1");

  // Convert ordered list items
  text = text.replace(/<ol[^>]*>/gi, "\n");
  text = text.replace(/<\/ol>/gi, "\n");
  let olCounter = 0;
  text = text.replace(/<li>(.*?)<\/li>/gi, (match, content) => {
    olCounter++;
    return `${olCounter}. ${content.trim()}\n`;
  });

  // Convert unordered list items
  text = text.replace(/<ul[^>]*>/gi, "\n");
  text = text.replace(/<\/ul>/gi, "\n");
  text = text.replace(/<li>(.*?)<\/li>/gi, "- $1\n");

  // Convert <p> to double newline
  text = text.replace(/<\/p>\s*<p>/gi, "\n\n");
  text = text.replace(/<p[^>]*>/gi, "");
  text = text.replace(/<\/p>/gi, "\n\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&pound;/g, "\u00A3");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&ldquo;/g, "\u201C");
  text = text.replace(/&rdquo;/g, "\u201D");
  text = text.replace(/&lsquo;/g, "\u2018");
  text = text.replace(/&rsquo;/g, "\u2019");
  text = text.replace(/&ndash;/g, "\u2013");
  text = text.replace(/&mdash;/g, "\u2014");
  text = text.replace(/&hellip;/g, "\u2026");

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  // Remove lines that are only whitespace
  text = text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n");

  return text;
}

/**
 * Strip HTML tags and return plain text.
 */
function stripHtml(html) {
  if (!html) return "";
  let text = html.replace(/<[^>]+>/g, "");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&pound;/g, "\u00A3");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&ldquo;/g, '"');
  text = text.replace(/&rdquo;/g, '"');
  text = text.replace(/&lsquo;/g, "'");
  text = text.replace(/&rsquo;/g, "'");
  text = text.replace(/&ndash;/g, "-");
  text = text.replace(/&mdash;/g, "-");
  return text.trim();
}

/**
 * Categorise an article based on its name, title, and keywords.
 */
function categorise(name, title, keywords) {
  const combined = `${name} ${title} ${keywords}`.toLowerCase();

  if (combined.includes("taxi") || combined.includes("cabsmart") || combined.includes("cab driver")) {
    return "taxi";
  }
  if (
    combined.includes("payroll") ||
    combined.includes("payslip") ||
    combined.includes("paye") ||
    combined.includes("wages") ||
    combined.includes("national insurance scheme") ||
    combined.includes("employers")
  ) {
    return "payroll";
  }
  if (
    combined.includes("vat") ||
    combined.includes("making tax digital") ||
    combined.includes("mtd") ||
    combined.includes("flat rate scheme")
  ) {
    return "vat";
  }
  if (
    combined.includes("company formation") ||
    combined.includes("limited liability") ||
    combined.includes("memorandum") ||
    combined.includes("articles of association") ||
    combined.includes("dormant company") ||
    combined.includes("directors") ||
    combined.includes("company name") ||
    combined.includes("introducing share") ||
    combined.includes("reference dates")
  ) {
    return "company-formation";
  }
  if (
    combined.includes("corporation tax") ||
    combined.includes("ct600") ||
    combined.includes("company accounts") ||
    combined.includes("limited company") ||
    combined.includes("balance sheet") ||
    combined.includes("final accounts") ||
    combined.includes("double entry") ||
    combined.includes("audit")
  ) {
    return "company-accounts";
  }
  if (
    combined.includes("self employed") ||
    combined.includes("self assessment") ||
    combined.includes("sole trader") ||
    combined.includes("self-employed") ||
    combined.includes("income tax") ||
    combined.includes("basis period") ||
    combined.includes("accounting period")
  ) {
    return "sole-trader";
  }
  if (
    combined.includes("capital allowance") ||
    combined.includes("mileage") ||
    combined.includes("business expense") ||
    combined.includes("disallowed") ||
    combined.includes("subsistence") ||
    combined.includes("travel expense") ||
    combined.includes("written down") ||
    combined.includes("fixed asset") ||
    combined.includes("annual investment")
  ) {
    return "expenses";
  }
  if (
    combined.includes("cash flow") ||
    combined.includes("budget") ||
    combined.includes("business plan") ||
    combined.includes("profit") ||
    combined.includes("credit crunch") ||
    combined.includes("credit squeeze") ||
    combined.includes("debt recovery") ||
    combined.includes("insurance")
  ) {
    return "financial-planning";
  }
  if (
    combined.includes("bookkeeping") ||
    combined.includes("spreadsheet") ||
    combined.includes("accounting software") ||
    combined.includes("cash accounting") ||
    combined.includes("record") ||
    combined.includes("software")
  ) {
    return "bookkeeping";
  }
  if (
    combined.includes("cis") ||
    combined.includes("time to pay") ||
    combined.includes("tax investigation") ||
    combined.includes("tax tips")
  ) {
    return "tax";
  }

  return "general";
}

/**
 * Convert a PascalCase name into a human-readable title.
 * e.g. "BusinessExpensesReduceTaxBills" -> "Business Expenses Reduce Tax Bills"
 */
function nameToTitle(name) {
  return name
    .replace(/Article$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

/**
 * Convert a name into a kebab-case ID.
 */
function toId(name) {
  return name
    .replace(/Article$/, "")
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "")
    .replace(/--+/g, "-");
}

/**
 * Escape a string for use in a TOML double-quoted value.
 */
function escapeTomlString(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// --- Main ---

if (!fs.existsSync(CONTENT_DIR)) {
  console.error(`Content directory not found: ${CONTENT_DIR}`);
  process.exit(1);
}

const files = fs
  .readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith("Article.md"))
  .sort();

console.log(`Found ${files.length} articles`);

const articles = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
  const parsed = parseMdcms(content);

  const name = (parsed.name || "").trim();
  const title = (parsed.title || "").trim();
  const description = stripHtml(parsed.description || "");
  const body = htmlToMarkdown(parsed.trailingBody || "");
  const keywords = (parsed.keywords || "").trim();
  const featured = (parsed.featured || "").trim() === "true";

  // Use name as fallback title if title is empty
  const effectiveTitle = !title || title.trim() === "" ? nameToTitle(name) : title;

  // Skip articles with empty bodies only
  if (!body || body.length < 20) {
    console.log(`  Skipping ${file}: empty body`);
    continue;
  }

  const id = toId(name);
  const category = categorise(name, effectiveTitle, keywords);

  // Build a combined answer from description + body
  let answer = "";
  if (description && description.length > 10) {
    answer = description + "\n\n" + body;
  } else {
    answer = body;
  }

  // Parse keywords into array
  const keywordList = keywords
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && k !== " ");

  articles.push({
    id,
    category,
    question: effectiveTitle,
    answer,
    keywords: keywordList,
    priority: featured ? 1 : 10,
    fileName: file,
  });
}

console.log(`\nProcessed ${articles.length} articles`);

// Assign priorities: featured first, then alphabetical within category
const categoryOrder = [
  "bookkeeping",
  "sole-trader",
  "company-accounts",
  "company-formation",
  "vat",
  "expenses",
  "payroll",
  "taxi",
  "financial-planning",
  "tax",
  "general",
];

articles.sort((a, b) => {
  // Featured articles first
  if (a.priority !== b.priority) return a.priority - b.priority;
  // Then by category order
  const catA = categoryOrder.indexOf(a.category);
  const catB = categoryOrder.indexOf(b.category);
  if (catA !== catB) return catA - catB;
  // Then alphabetical
  return a.question.localeCompare(b.question);
});

// Reassign sequential priorities
articles.forEach((a, i) => {
  a.priority = i + 1;
});

// Log category counts
const catCounts = {};
for (const a of articles) {
  catCounts[a.category] = (catCounts[a.category] || 0) + 1;
}
console.log("\nCategory counts:");
for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(ARTICLES_DIR)) {
  fs.mkdirSync(ARTICLES_DIR, { recursive: true });
}

// Generate TOML index (lightweight: no full answer, just short description)
let toml = `# SPDX-License-Identifier: AGPL-3.0-only
# Copyright (C) 2025-2026 DIY Accounting Ltd

# DIY Accounting Spreadsheets Knowledge Base - Index
# Generated from diy-accounting-mdcms/content/ articles
# Full article content in articles/{id}.md
# Categories: ${categoryOrder.join(", ")}

`;

for (const article of articles) {
  // Create a short description from the first sentence of the answer
  const firstSentence = article.answer.split(/[.\n]/).filter((s) => s.trim().length > 10)[0];
  const shortDesc = firstSentence ? firstSentence.trim().replace(/\*\*/g, "").substring(0, 200) : "";

  toml += `[[article]]\n`;
  toml += `id = "${escapeTomlString(article.id)}"\n`;
  toml += `category = "${article.category}"\n`;
  toml += `question = "${escapeTomlString(article.question)}"\n`;
  toml += `description = "${escapeTomlString(shortDesc)}"\n`;

  if (article.keywords.length > 0) {
    const kwStr = article.keywords.map((k) => `"${escapeTomlString(k)}"`).join(", ");
    toml += `keywords = [${kwStr}]\n`;
  } else {
    toml += `keywords = []\n`;
  }

  toml += `priority = ${article.priority}\n`;
  toml += `\n`;
}

fs.writeFileSync(OUTPUT_TOML, toml, "utf-8");
const tomlSize = fs.statSync(OUTPUT_TOML).size;
console.log(`\nWritten ${OUTPUT_TOML} (${(tomlSize / 1024).toFixed(1)} KB)`);

// Write individual article markdown files
for (const article of articles) {
  const articlePath = path.join(ARTICLES_DIR, `${article.id}.md`);
  fs.writeFileSync(articlePath, article.answer, "utf-8");
}
console.log(`Written ${articles.length} article files to ${ARTICLES_DIR}/`);

const totalArticleSize = articles.reduce((sum, a) => sum + fs.statSync(path.join(ARTICLES_DIR, `${a.id}.md`)).size, 0);
console.log(`Total article content: ${(totalArticleSize / 1024).toFixed(1)} KB`);
console.log(`Total articles: ${articles.length}`);

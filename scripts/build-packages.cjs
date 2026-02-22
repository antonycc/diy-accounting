#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 DIY Accounting Ltd
//
// build-packages.cjs — Scan packages/ directories, create zip files, generate catalogue.toml
//
// Usage:
//   node scripts/build-packages.cjs
//
// Reads:  packages/   (product directories with Excel workbooks and PDFs)
// Writes: target/zips/          (zip files for S3 upload)
//         web/spreadsheets.diyaccounting.co.uk/public/catalogue.toml

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Paths
const ROOT = path.resolve(__dirname, "..");
const PACKAGES_DIR = path.join(ROOT, "packages");
const ZIPS_DIR = path.join(ROOT, "target", "zips");
const CATALOGUE_PATH = path.join(ROOT, "web", "spreadsheets.diyaccounting.co.uk", "public", "catalogue.toml");

// Regex to parse standard package directory names
// e.g. "GB Accounts Basic Sole Trader 2025-04-05 (Apr25) Excel 2007"
const PACKAGE_RE = /^GB Accounts (.+?) (\d{4}-\d{2}-\d{2}) \((\w+)\) (Excel \d{4})$/;

// Regex to parse Company (Any) directory names
// e.g. "GB Accounts Company 2024-2025 (Any) Excel 2007"
const ANY_RE = /^GB Accounts Company (\d{4})-(\d{4}) \(Any\) (Excel \d{4})$/;

// Product display names and IDs for the catalogue
const PRODUCTS = {
  "Basic Sole Trader": {
    id: "BasicSoleTrader",
    description:
      "Simple bookkeeping spreadsheet for sole traders not registered for VAT. Includes profit & loss, self assessment tax, and fixed assets.",
  },
  "Self Employed": {
    id: "SelfEmployed",
    description:
      "Full bookkeeping spreadsheet for self-employed businesses. Includes sales, purchases, VAT returns, bank reconciliation, payslips, and self assessment.",
  },
  "Company": {
    id: "Company",
    description:
      "Complete accounting spreadsheet for limited companies. Includes sales, purchases, VAT, corporation tax, payroll, dividends, and year-end accounts.",
  },
  "Taxi Driver": {
    id: "TaxiDriver",
    description:
      "Bookkeeping spreadsheet designed for taxi drivers. Branded as Cabsmart, includes income tax, VAT, profit & loss, receipts, and expenses tracking.",
  },
  "Payslip 05": {
    id: "Payslip05",
    description: "Payslip generator for up to 5 employees. Calculates PAYE, National Insurance, student loans, and pension contributions.",
  },
  "Payslip 10": {
    id: "Payslip10",
    description: "Payslip generator for up to 10 employees. Calculates PAYE, National Insurance, student loans, and pension contributions.",
  },
};

// Months for Company (Any) generation
const MONTHS = [
  { month: 4, days: 30, abbr: "Apr" },
  { month: 5, days: 31, abbr: "May" },
  { month: 6, days: 30, abbr: "Jun" },
  { month: 7, days: 31, abbr: "Jul" },
  { month: 8, days: 31, abbr: "Aug" },
  { month: 9, days: 30, abbr: "Sep" },
  { month: 10, days: 31, abbr: "Oct" },
  { month: 11, days: 30, abbr: "Nov" },
  { month: 12, days: 31, abbr: "Dec" },
  { month: 1, days: 31, abbr: "Jan" },
  { month: 2, days: 28, abbr: "Feb" }, // adjusted for leap year below
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function monthEndDate(year, month) {
  if (month === 2 && isLeapYear(year)) return 29;
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysInMonth[month];
}

function zipDirectory(sourceDir, zipPath) {
  const zipDir = path.dirname(zipPath);
  fs.mkdirSync(zipDir, { recursive: true });
  // Remove existing zip if present
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  // Zip contents from within the directory, excluding .git and .sh files
  execSync(`zip -r "${zipPath}" . -q -X -x "*/.git/*" "*.sh"`, {
    cwd: sourceDir,
    stdio: "pipe",
  });
}

function generateCompanyVariants(sourceDir, startYear, endYear, format) {
  const zips = [];
  const firstYearEnd = startYear + 1;
  const secondYearEnd = endYear + 1;

  // Cutoff: only generate variants whose financial year has already started.
  // A company with year-end in month M of year Y has a financial year
  // starting in month M+1 of year Y-1. Generate only if today >= that start.
  const now = new Date();
  const currentYM = now.getFullYear() * 12 + (now.getMonth() + 1);

  for (const m of MONTHS) {
    const year = m.month >= 4 ? firstYearEnd : secondYearEnd;

    // Financial year start: month after year-end, one year earlier
    const fyStartMonth = m.month === 12 ? 1 : m.month + 1;
    const fyStartYear = m.month === 12 ? year : year - 1;
    const fyStartYM = fyStartYear * 12 + fyStartMonth;

    if (currentYM < fyStartYM) {
      console.log(`  Skipping Company variant (FY not started): ${m.abbr}${String(year).slice(-2)}`);
      continue;
    }

    const yr2 = String(year).slice(-2);
    const days = monthEndDate(year, m.month);
    const date = `${year}-${pad2(m.month)}-${pad2(days)}`;
    const shortLabel = `${m.abbr}${yr2}`;
    const zipName = `GB Accounts Company ${date} (${shortLabel}) ${format}`;
    const zipPath = path.join(ZIPS_DIR, `${zipName}.zip`);

    console.log(`  Zipping Company variant: ${zipName}`);
    zipDirectory(sourceDir, zipPath);

    zips.push({
      product: "Company",
      date,
      shortLabel,
      format,
      filename: `${zipName}.zip`,
    });
  }

  return zips;
}

function scanAndBuild() {
  // Clean and create output directory
  if (fs.existsSync(ZIPS_DIR)) fs.rmSync(ZIPS_DIR, { recursive: true });
  fs.mkdirSync(ZIPS_DIR, { recursive: true });

  if (!fs.existsSync(PACKAGES_DIR)) {
    console.error(`packages/ directory not found at ${PACKAGES_DIR}`);
    process.exit(1);
  }

  const entries = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const allPackages = []; // { product, date, shortLabel, format, filename }

  for (const dirName of entries) {
    const dirPath = path.join(PACKAGES_DIR, dirName);

    // Skip work-in-progress
    if (fs.existsSync(path.join(dirPath, "DO NOT USE - WORK IN PROGRESS.txt"))) {
      console.log(`Skipping (WIP): ${dirName}`);
      continue;
    }

    // Try Company (Any) pattern first
    const anyMatch = dirName.match(ANY_RE);
    if (anyMatch) {
      const startYear = parseInt(anyMatch[1], 10);
      const endYear = parseInt(anyMatch[2], 10);
      const format = anyMatch[3];
      console.log(`Company (Any): ${dirName} → generating monthly variants`);
      const variants = generateCompanyVariants(dirPath, startYear, endYear, format);
      allPackages.push(...variants);
      continue;
    }

    // Standard package pattern
    const match = dirName.match(PACKAGE_RE);
    if (!match) {
      console.log(`Skipping (unrecognised): ${dirName}`);
      continue;
    }

    const [, productName, date, shortLabel, format] = match;

    // Skip non-public products
    if (!PRODUCTS[productName]) {
      console.log(`Skipping (filtered): ${dirName}`);
      continue;
    }

    const zipName = `${dirName}.zip`;
    const zipPath = path.join(ZIPS_DIR, zipName);

    console.log(`Zipping: ${dirName}`);
    zipDirectory(dirPath, zipPath);

    allPackages.push({ product: productName, date, shortLabel, format, filename: zipName });
  }

  return allPackages;
}

function dateToLabel(date) {
  const [y, m] = date.split("-").map(Number);
  const months = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[m]} ${y}`;
}

function generateCatalogue(allPackages) {
  // Group by product
  const byProduct = {};
  for (const pkg of allPackages) {
    if (!byProduct[pkg.product]) byProduct[pkg.product] = [];
    byProduct[pkg.product].push(pkg);
  }

  // Sort each product's packages by date descending (newest first)
  for (const product of Object.keys(byProduct)) {
    byProduct[product].sort((a, b) => b.date.localeCompare(a.date));
  }

  // Build TOML
  const lines = [
    "# catalogue.toml — Auto-generated by scripts/build-packages.cjs",
    "# Do not edit manually; regenerated on each deploy from packages/ directory.",
    "",
    `generated = "${new Date().toISOString().split("T")[0]}"`,
    "",
  ];

  // Output products in a stable order
  const productOrder = ["Basic Sole Trader", "Self Employed", "Company", "Taxi Driver", "Payslip 05", "Payslip 10"];

  for (const productName of productOrder) {
    const meta = PRODUCTS[productName];
    if (!meta || !byProduct[productName]) continue;

    lines.push(`[[products]]`);
    lines.push(`id = "${meta.id}"`);
    lines.push(`name = "${productName}"`);
    lines.push(`description = "${meta.description}"`);
    lines.push("");

    for (const pkg of byProduct[productName]) {
      lines.push(`  [[products.periods]]`);
      lines.push(`  date = "${pkg.date}"`);
      lines.push(`  label = "${dateToLabel(pkg.date)}"`);
      lines.push(`  short = "${pkg.shortLabel}"`);
      lines.push(`  format = "${pkg.format}"`);
      lines.push(`  filename = "${pkg.filename}"`);
      lines.push("");
    }
  }

  const toml = lines.join("\n");
  fs.mkdirSync(path.dirname(CATALOGUE_PATH), { recursive: true });
  fs.writeFileSync(CATALOGUE_PATH, toml, "utf8");
  console.log(`\nCatalogue written to ${CATALOGUE_PATH}`);
  console.log(`Total packages: ${allPackages.length}`);
}

// Main
console.log("=== build-packages.cjs ===");
console.log(`Packages dir: ${PACKAGES_DIR}`);
console.log(`Output zips:  ${ZIPS_DIR}`);
console.log("");

const packages = scanAndBuild();
generateCatalogue(packages);

// Summary
const zipFiles = fs.readdirSync(ZIPS_DIR).filter((f) => f.endsWith(".zip"));
console.log(`\nGenerated ${zipFiles.length} zip files in target/zips/`);

#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd
//
// generate.js — CLI entry point for spreadsheet and guide generation.
// Dispatches to product modules in app/products/ which define their own metadata.
//
// Usage:
//   node app/bin/generate.js                                          # all packages, all years
//   node app/bin/generate.js --package bst                            # Basic Sole Trader only
//   node app/bin/generate.js --package taxi                           # Taxi Driver only
//   node app/bin/generate.js --years se-2024-2025 se-2025-2026        # specific years
//   node app/bin/generate.js --skip-guide                             # spreadsheets only, no PDF
//   node app/bin/generate.js --source-date-epoch 1711670400           # override PDF timestamp

import { parse as parseTOML } from "smol-toml";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  generateSpreadsheet,
  formatDateDDMMYY,
  formatDateYYYYMMDD,
  shortLabel,
  renameMonthTabs,
  rewriteVatinterfaceFormulas,
  renameExternalLinkSheetNames,
  monthEnd,
} from "../lib/generator.js";
import { generatePdf } from "../lib/guide.js";
import { runSpreadsheet, runMultiFileSpreadsheet } from "../lib/spreadsheet-runner.js";
import { loadDiyaGlData, diyaGlToScenario } from "../lib/diya-gl-loader.js";
import { PRODUCT as BST } from "../products/bst.js";
import { PRODUCT as TAXI } from "../products/taxi.js";
import { PRODUCT as SE } from "../products/se.js";
import { PRODUCT as LTD } from "../products/ltd.js";
import * as bstMod from "../products/bst.js";
import * as taxiMod from "../products/taxi.js";
import * as seMod from "../products/se.js";
import * as ltdMod from "../products/ltd.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, "..");
const ROOT = resolve(APP_DIR, "..");
const DATA_DIR = resolve(APP_DIR, "data");
const OUTPUT_DIR = resolve(ROOT, "packages");

const PRODUCTS = {
  bst: BST,
  taxi: TAXI,
  se: SE,
  ltd: LTD,
};

async function generateProduct(productDir, tomlPath, sourceDateEpoch, skipGuide, opts = {}) {
  const productMeta = parseTOML(readFileSync(resolve(productDir, "meta.toml"), "utf8"));
  const sharedMeta = parseTOML(readFileSync(resolve(APP_DIR, "templates", "meta.toml"), "utf8"));

  const taxData = opts.overrideTaxData || parseTOML(readFileSync(tomlPath, "utf8"));
  const ty = taxData.tax_year || taxData.financial_year;
  const yearEndMonth = opts.yearEndMonth || 0;
  const endDate = new Date(ty.end);

  // Skip packages whose year-end is more than 14 months from now.
  // 14 months ensures the next tax year's packages are available from early March
  // (covers the budget-in-March scenario where SE Apr 2027 is needed by 6 Mar 2026).
  // The website download default uses a tighter 13-month window for the pre-selected year.
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() + 14);
  cutoff.setUTCDate(0); // last day of the month 13 months from now
  if (endDate > cutoff) {
    console.log(
      `\nSkipping ${productMeta.product.name} for ${ty.label} (year-end ${endDate.toISOString().slice(0, 10)} is beyond cutoff ${cutoff.toISOString().slice(0, 10)})`,
    );
    return null;
  }

  console.log(`\nGenerating ${productMeta.product.name} for ${ty.label}...`);

  // Build output directory
  const dateStr = formatDateYYYYMMDD(endDate);
  const label = shortLabel(endDate);
  const ddmmyy = formatDateDDMMYY(endDate);

  const dirName = productMeta.output.dir_pattern
    .replace("{prefix}", sharedMeta.package.prefix)
    .replace("{name}", productMeta.product.name)
    .replace("{year_end_date}", dateStr)
    .replace("{short_label}", label)
    .replace("{format}", sharedMeta.package.format);

  const outDir = resolve(OUTPUT_DIR, dirName);
  mkdirSync(outDir, { recursive: true });

  const TAB_RENAME_FILES = new Set([
    "Sales.xlsx",
    "Purchases.xlsx",
    "Currentaccount.xlsx",
    "Savingaccount.xlsx",
    "Cashaccount.xlsx",
    "Creditcardaccount.xlsx",
    "Payslips.xlsx",
  ]);

  if (productMeta.template.files) {
    for (const templateFile of productMeta.template.files) {
      let buffer = readFileSync(resolve(productDir, templateFile));
      const fileKey = templateFile.replace(".xlsx", "").replace(".docx", "").toLowerCase();
      const sheetsConfig = productMeta.sheets?.[fileKey];

      if (sheetsConfig && Object.keys(sheetsConfig).length > 0) {
        buffer = await generateSpreadsheet(buffer, taxData, sheetsConfig);
      }

      if (yearEndMonth && templateFile.endsWith(".xlsx") && TAB_RENAME_FILES.has(templateFile)) {
        buffer = await renameMonthTabs(buffer, yearEndMonth);
        buffer = await renameExternalLinkSheetNames(buffer, yearEndMonth);
      }

      if (yearEndMonth && fileKey === "vatreturns" && sheetsConfig) {
        buffer = await rewriteVatinterfaceFormulas(buffer, yearEndMonth, "xl/worksheets/sheet6.xml");
      }

      if (yearEndMonth && fileKey === "financialaccounts") {
        buffer = await renameExternalLinkSheetNames(buffer, yearEndMonth);
      }

      writeFileSync(resolve(outDir, templateFile), buffer);
    }
    console.log(`  Written: ${dirName}/`);
    console.log(`           ${productMeta.template.files.length} files`);
  } else {
    // Single-file product (BST, Taxi)
    const templatePath = resolve(productDir, productMeta.template.spreadsheet);
    const templateBuffer = readFileSync(templatePath);

    const xlsxBuffer = await generateSpreadsheet(templateBuffer, taxData, productMeta.sheets);

    const xlsxFilename = productMeta.output.spreadsheet_pattern.replace("{year_end_ddmmyy}", ddmmyy);
    writeFileSync(resolve(outDir, xlsxFilename), xlsxBuffer);
    console.log(`  Written: ${dirName}/`);
    console.log(`           ${xlsxFilename}`);
  }

  // Generate PDF guides
  if (!skipGuide) {
    const guides = [];
    if (productMeta.template.guide) {
      guides.push({ md: productMeta.template.guide, pdf: productMeta.output.guide_filename });
    }
    if (productMeta.template.payslip_guide) {
      guides.push({ md: productMeta.template.payslip_guide, pdf: productMeta.output.payslip_guide_filename });
    }
    for (const { md, pdf } of guides) {
      const guideMd = resolve(productDir, md);
      const guidePdf = resolve(outDir, pdf);
      try {
        await generatePdf(guideMd, guidePdf, sourceDateEpoch);
        console.log(`  Guide:   ${pdf}`);
      } catch (e) {
        console.warn(`  Warning: PDF guide generation failed (${pdf}) — ${e.message}`);
      }
    }
  }

  return { dirName, taxYear: ty.label };
}

function parseArgs(argv) {
  const args = argv.slice(2);

  let packageFilter = "all";
  const pkgIdx = args.indexOf("--package");
  if (pkgIdx !== -1 && args[pkgIdx + 1]) {
    packageFilter = args[pkgIdx + 1];
  }

  let tomlFiles;
  const yearsIdx = args.indexOf("--years");
  if (yearsIdx !== -1) {
    const years = [];
    for (let i = yearsIdx + 1; i < args.length; i++) {
      if (args[i].startsWith("--")) break;
      years.push(args[i]);
    }
    tomlFiles = years.map((y) => resolve(DATA_DIR, `${y}.toml`));
  } else {
    tomlFiles = readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".toml"))
      .sort()
      .map((f) => resolve(DATA_DIR, f));
  }

  let sourceDateEpoch;
  const epochIdx = args.indexOf("--source-date-epoch");
  if (epochIdx !== -1 && args[epochIdx + 1]) {
    sourceDateEpoch = parseInt(args[epochIdx + 1], 10);
  }

  const skipGuide = args.includes("--skip-guide");

  let yearEndFilter = null;
  const yeIdx = args.indexOf("--year-end");
  if (yeIdx !== -1) {
    yearEndFilter = [];
    for (let i = yeIdx + 1; i < args.length; i++) {
      if (args[i].startsWith("--")) break;
      yearEndFilter.push(args[i]);
    }
  }

  let dataDir = null;
  const dataIdx = args.indexOf("--data");
  if (dataIdx !== -1 && args[dataIdx + 1]) {
    dataDir = args[dataIdx + 1];
  }

  let outputDir = null;
  const outIdx = args.indexOf("--output-dir");
  if (outIdx !== -1 && args[outIdx + 1]) {
    outputDir = args[outIdx + 1];
  }

  let offset = null;
  const offIdx = args.indexOf("--offset");
  if (offIdx !== -1 && args[offIdx + 1]) {
    offset = args[offIdx + 1];
  }

  return { packageFilter, tomlFiles, sourceDateEpoch, skipGuide, yearEndFilter, dataDir, outputDir, offset };
}

async function main() {
  console.log("=== generate.js ===");

  const {
    packageFilter,
    tomlFiles,
    sourceDateEpoch,
    skipGuide,
    yearEndFilter,
    dataDir,
    outputDir: outputDirOverride,
    offset,
  } = parseArgs(process.argv);

  // Determine which products to generate
  const productsToGenerate = packageFilter === "all" ? Object.entries(PRODUCTS) : [[packageFilter, PRODUCTS[packageFilter]]];

  for (const [key, product] of productsToGenerate) {
    if (!product) {
      console.error(`Unknown package: ${key}. Available: ${Object.keys(PRODUCTS).join(", ")}`);
      process.exit(1);
    }
  }

  console.log("Package: ", packageFilter === "all" ? "all" : packageFilter);
  console.log(
    "Tax data:",
    tomlFiles.map((f) => f.split("/").pop()),
  );
  console.log("Output:  ", OUTPUT_DIR);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = [];
  for (const [, product] of productsToGenerate) {
    const productDir = resolve(APP_DIR, "templates", product.dir);
    const productMeta = parseTOML(readFileSync(resolve(productDir, "meta.toml"), "utf8"));

    for (const tomlFile of tomlFiles) {
      const tomlName = tomlFile.split("/").pop();
      if (!tomlName.startsWith(productMeta.product.tax_regime + "-")) continue;

      if (productMeta.product.tax_regime === "ltd") {
        const taxData = parseTOML(readFileSync(tomlFile, "utf8"));
        const fyStart = new Date(taxData.financial_year.start);
        const fyEnd = new Date(taxData.financial_year.end);

        for (let m = 0; m < 12; m++) {
          const meYear = fyStart.getUTCFullYear() + Math.floor((fyStart.getUTCMonth() + m) / 12);
          const meMonth = (fyStart.getUTCMonth() + m) % 12;
          const yearEndDate = monthEnd(meYear, meMonth + 1);

          if (yearEndDate > fyEnd) break;

          const yeStr = yearEndDate.toISOString().slice(0, 10);
          if (yearEndFilter && !yearEndFilter.includes(yeStr)) continue;

          const overrideTaxData = JSON.parse(JSON.stringify(taxData));
          overrideTaxData.financial_year.end = yearEndDate.toISOString().slice(0, 10);

          const yearEndMonth = yearEndDate.getUTCMonth() + 1;
          const result = await generateProduct(productDir, tomlFile, sourceDateEpoch, skipGuide, {
            overrideTaxData,
            yearEndMonth,
          });
          if (result) results.push(result);
        }
      } else {
        if (yearEndFilter) {
          const td = parseTOML(readFileSync(tomlFile, "utf8"));
          const tyEnd = (td.tax_year || td.financial_year).end;
          const tyEndStr = typeof tyEnd === "string" ? tyEnd : new Date(tyEnd).toISOString().slice(0, 10);
          if (!yearEndFilter.includes(tyEndStr)) continue;
        }
        const result = await generateProduct(productDir, tomlFile, sourceDateEpoch, skipGuide);
        if (result) results.push(result);
      }
    }
  }

  console.log(`\n=== Generated ${results.length} packages ===`);
  for (const r of results) {
    console.log(`  ${r.taxYear}: ${r.dirName}/`);
  }

  // If --data provided, inject diya-gl data into the generated package and recalculate
  if (dataDir && results.length > 0) {
    const PRODUCT_MODULES = { bst: bstMod, taxi: taxiMod, se: seMod, ltd: ltdMod };
    const productMod = PRODUCT_MODULES[packageFilter];
    if (!productMod) {
      console.error(`--data requires --package (not 'all'). Got: ${packageFilter}`);
      process.exit(1);
    }

    const { book, lines } = loadDiyaGlData(resolve(dataDir), offset);
    const scenario = diyaGlToScenario(book, lines, packageFilter);

    // Use the last generated package (most recent year-end)
    const lastResult = results[results.length - 1];
    const pkgDir = resolve(OUTPUT_DIR, lastResult.dirName);
    const finalOutputDir = outputDirOverride ? resolve(outputDirOverride) : pkgDir;

    // Extract year-end info from the directory name
    const yearEndMatch = lastResult.dirName.match(/(\d{4})-(\d{2})-(\d{2})/);
    const endYear = yearEndMatch ? parseInt(yearEndMatch[1], 10) : null;
    const endMonth = yearEndMatch ? parseInt(yearEndMatch[2], 10) : null;
    const startYear = endYear ? endYear - 1 : null;

    const writes = productMod.cellWrites(scenario, startYear, endMonth);
    const reads = productMod.standardReads();

    console.log(`\n=== Injecting diya-gl data into ${lastResult.dirName} ===`);

    if (productMod.MULTI_FILE) {
      const { readdirSync: readdirSyncFs } = await import("fs");
      const xlsxFiles = readdirSyncFs(pkgDir).filter((f) => f.endsWith(".xlsx"));
      const fileBuffers = {};
      for (const f of xlsxFiles) {
        fileBuffers[f] = readFileSync(resolve(pkgDir, f));
      }
      await runMultiFileSpreadsheet(fileBuffers, writes, reads, "Financialaccounts.xlsx", {
        saveRecalculatedTo: finalOutputDir,
      });
    } else {
      const xlsxFiles = readdirSync(pkgDir).filter((f) => f.endsWith(".xlsx"));
      if (xlsxFiles.length === 0) {
        console.error(`No xlsx found in ${pkgDir}`);
        process.exit(1);
      }
      const xlsxBuffer = readFileSync(resolve(pkgDir, xlsxFiles[0]));
      await runSpreadsheet(xlsxBuffer, writes, reads, {
        saveRecalculatedTo: resolve(finalOutputDir, xlsxFiles[0]),
      });
    }

    console.log(`Populated package written to ${finalOutputDir}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

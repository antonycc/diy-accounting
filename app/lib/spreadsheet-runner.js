// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd
//
// spreadsheet-runner.js — Write data into xlsx cells, recalculate via
// LibreOffice headless, and read back computed values.
//
// Prerequisites: LibreOffice installed
//   macOS: brew install --cask libreoffice
//   Ubuntu (GitHub Actions): pre-installed on ubuntu-24.04

import JSZip from "jszip";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from "fs";
import { resolve, dirname, basename } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

// ── Find LibreOffice binary ─────────────────────────────────────────────────

function findLibreOffice() {
  const candidates = ["libreoffice", "soffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice", "/usr/bin/libreoffice"];
  for (const cmd of candidates) {
    try {
      execSync(`"${cmd}" --version`, { stdio: "pipe" });
      return cmd;
    } catch {
      // try next
    }
  }
  throw new Error("LibreOffice not found. Install: brew install --cask libreoffice (macOS) or apt install libreoffice-calc (Linux)");
}

let cachedBinary = null;
function getLibreOffice() {
  if (!cachedBinary) cachedBinary = findLibreOffice();
  return cachedBinary;
}

// ── Excel serial number helpers ─────────────────────────────────────────────

function toExcelSerial(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const epoch = Date.UTC(1899, 11, 30);
  return Math.round((date.getTime() - epoch) / (24 * 60 * 60 * 1000));
}

// ── XML cell editing (same approach as generator.js) ────────────────────────

function setCellValue(xml, cellRef, value) {
  const cellPattern = new RegExp(`(<c\\s+r="${cellRef}"\\s[^>]*?)(/?>)((?:(?!</c>).)*(?:</c>)?)`, "s");
  const match = xml.match(cellPattern);
  if (!match) return insertCell(xml, cellRef, value);

  const [fullMatch, openTag] = match;
  const newOpenTag = openTag.replace(/\s+t="[^"]*"/, "");
  return xml.replace(fullMatch, `${newOpenTag}><v>${value}</v></c>`);
}

function setCellString(xml, cellRef, str) {
  const cellPattern = new RegExp(`(<c\\s+r="${cellRef}"\\s[^>]*?)(/?>)((?:(?!</c>).)*(?:</c>)?)`, "s");
  const match = xml.match(cellPattern);
  if (!match) return insertCellString(xml, cellRef, str);

  const [fullMatch, openTag] = match;
  let newOpenTag = openTag.replace(/\s+t="[^"]*"/, "");
  newOpenTag += ` t="inlineStr"`;
  return xml.replace(fullMatch, `${newOpenTag}><is><t>${escapeXml(str)}</t></is></c>`);
}

// Column letter(s) to numeric index (A=1, B=2, ..., Z=26, AA=27)
function colToNum(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + ch.charCodeAt(0) - 64;
  return n;
}

// Insert a new cell into a row, respecting column order.
// Handles self-closing rows (<row ... />) by converting to open/close form.
function insertCellIntoRow(xml, cellRef, cellXml) {
  const rowNum = parseInt(cellRef.replace(/[A-Z]+/, ""), 10);
  const colLetters = cellRef.replace(/\d+/, "");
  const colNum = colToNum(colLetters);

  // Match the full row element (self-closing or with content)
  const rowPattern = new RegExp(`<row\\s+r="${rowNum}"[^>]*/\\s*>|<row\\s+r="${rowNum}"[^>]*>.*?</row>`, "s");
  const rowMatch = xml.match(rowPattern);

  if (!rowMatch) {
    // Row doesn't exist — insert before </sheetData>
    const newRow = `<row r="${rowNum}">${cellXml}</row>`;
    return xml.replace("</sheetData>", `${newRow}</sheetData>`);
  }

  const fullRow = rowMatch[0];

  // If self-closing row, convert to open/close and insert cell
  if (fullRow.match(/<row[^>]*\/\s*>/)) {
    const openTag = fullRow.replace(/\/\s*>$/, ">");
    const newRow = `${openTag}${cellXml}</row>`;
    return xml.replace(fullRow, newRow);
  }

  // Row has content — find the right insertion point by column order
  const cellPattern = /<c\s+r="([A-Z]+)\d+"/g;
  let insertBefore = null;
  let lastMatch = null;
  let m;
  while ((m = cellPattern.exec(fullRow)) !== null) {
    const existingCol = colToNum(m[1]);
    if (existingCol > colNum && !insertBefore) {
      insertBefore = m.index;
    }
    lastMatch = m;
  }

  if (insertBefore !== null) {
    // Insert before the first cell with a higher column number
    const newRow = fullRow.slice(0, insertBefore) + cellXml + fullRow.slice(insertBefore);
    return xml.replace(fullRow, newRow);
  }

  // All existing cells have lower column numbers — insert before </row>
  const newRow = fullRow.replace("</row>", `${cellXml}</row>`);
  return xml.replace(fullRow, newRow);
}

function insertCell(xml, cellRef, value) {
  return insertCellIntoRow(xml, cellRef, `<c r="${cellRef}"><v>${value}</v></c>`);
}

function insertCellString(xml, cellRef, str) {
  return insertCellIntoRow(xml, cellRef, `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(str)}</t></is></c>`);
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Sheet name → xlsx path mapping ──────────────────────────────────────────

// Reads workbook.xml and workbook.xml.rels to build sheet name → file path map
async function buildSheetMap(zip) {
  const wbXml = await zip.file("xl/workbook.xml").async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels").async("string");

  // Extract sheet name → rId mapping
  const sheetEntries = [...wbXml.matchAll(/name="([^"]*)"[^/]*r:id="(rId\d+)"/g)];
  // Extract rId → target file mapping
  const relEntries = [...relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]*)"/g)];

  const ridToFile = new Map();
  for (const [, rid, target] of relEntries) {
    ridToFile.set(rid, `xl/${target}`);
  }

  const sheetMap = new Map();
  for (const [, name, rid] of sheetEntries) {
    const decodedName = name.replace(/&amp;/g, "&");
    const file = ridToFile.get(rid);
    if (file) sheetMap.set(decodedName, file);
  }

  return sheetMap;
}

// ── Core: write data, recalculate, read results ─────────────────────────────

/**
 * Write cell data into an xlsx buffer, recalculate via LibreOffice, read back values.
 *
 * @param {Buffer} xlsxBuffer - The source xlsx file as a Buffer
 * @param {Object} cellWrites - { "SheetName": { "A5": value, "B5": "string", ... }, ... }
 *   Numbers are written as numeric values. Strings are written as inline strings.
 *   Date-like values should be pre-converted to Excel serial numbers.
 * @param {Object} cellReads - { "SheetName": ["A1", "C4", ...], ... }
 * @param {Object} [options] - { saveRecalculatedTo: "/path/to/save.xlsx" }
 * @returns {Object} - { "SheetName": { "A1": value, "C4": value, ... }, ... }
 */
export async function runSpreadsheet(xlsxBuffer, cellWrites, cellReads, options = {}) {
  const soffice = getLibreOffice();
  const workDir = resolve(tmpdir(), `spreadsheet-test-${randomBytes(4).toString("hex")}`);
  mkdirSync(workDir, { recursive: true });

  try {
    // 1. Write data into the xlsx
    const zip = await JSZip.loadAsync(xlsxBuffer);
    const sheetMap = await buildSheetMap(zip);

    for (const [sheetName, cells] of Object.entries(cellWrites)) {
      const sheetPath = sheetMap.get(sheetName);
      if (!sheetPath) throw new Error(`Sheet "${sheetName}" not found in workbook`);

      let xml = await zip.file(sheetPath).async("string");
      for (const [cellRef, value] of Object.entries(cells)) {
        if (typeof value === "string") {
          xml = setCellString(xml, cellRef, value);
        } else {
          xml = setCellValue(xml, cellRef, value);
        }
      }
      const originalDate = zip.file(sheetPath).date;
      zip.file(sheetPath, xml, { date: originalDate });
    }

    // Write modified xlsx to temp dir
    const inputPath = resolve(workDir, "input.xlsx");
    const outBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 1 },
    });
    writeFileSync(inputPath, outBuffer);

    // 2. Recalculate via LibreOffice headless
    // Direct xlsx→xlsx doesn't recalculate. Roundtrip through xls forces recalc.
    // Use a unique UserInstallation per invocation to avoid profile lock conflicts.
    const userProfile = `file://${resolve(workDir, "lo_profile")}`;
    execSync(
      `"${soffice}" --headless --norestore --calc -env:UserInstallation="${userProfile}" --convert-to xls --outdir "${workDir}" "${inputPath}"`,
      { stdio: "pipe", timeout: 30000 },
    );
    const xlsPath = resolve(workDir, "input.xls");
    execSync(
      `"${soffice}" --headless --norestore --calc -env:UserInstallation="${userProfile}" --convert-to xlsx --outdir "${workDir}" "${xlsPath}"`,
      { stdio: "pipe", timeout: 30000 },
    );

    // 3. Read back computed values
    const recalcPath = resolve(workDir, "input.xlsx");
    const recalcBuffer = readFileSync(recalcPath);
    const recalcZip = await JSZip.loadAsync(recalcBuffer);
    const recalcSheetMap = await buildSheetMap(recalcZip);

    const sharedStrings = await loadSharedStrings(recalcZip);

    const results = {};
    for (const [sheetName, cellRefs] of Object.entries(cellReads)) {
      const sheetPath = recalcSheetMap.get(sheetName);
      if (!sheetPath) throw new Error(`Sheet "${sheetName}" not found in recalculated workbook`);

      const xml = await recalcZip.file(sheetPath).async("string");
      results[sheetName] = {};

      for (const cellRef of cellRefs) {
        results[sheetName][cellRef] = readCellValue(xml, cellRef, sharedStrings);
      }
    }

    // Optionally save the recalculated xlsx
    if (options.saveRecalculatedTo) {
      const saveDir = dirname(options.saveRecalculatedTo);
      mkdirSync(saveDir, { recursive: true });
      cpSync(recalcPath, options.saveRecalculatedTo);
    }

    return results;
  } finally {
    // Clean up
    rmSync(workDir, { recursive: true, force: true });
  }
}

function decodeXmlEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Load shared strings table from xlsx zip
async function loadSharedStrings(zip) {
  const ssFile = zip.file("xl/sharedStrings.xml");
  if (!ssFile) return [];
  const xml = await ssFile.async("string");
  // Match <si> elements — handle both <t>text</t> and <r><t>text</t></r> (rich text) forms
  const strings = [];
  const siMatches = [...xml.matchAll(/<si>(.*?)<\/si>/gs)];
  for (const m of siMatches) {
    const inner = m[1];
    // Concatenate all <t> elements within this <si> (handles rich text with multiple <r><t> runs)
    const parts = [...inner.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((t) => decodeXmlEntities(t[1]));
    strings.push(parts.join(""));
  }
  return strings;
}

// Read a cell's value from sheet XML (after recalculation, values are in <v> tags)
function readCellValue(xml, cellRef, sharedStrings = []) {
  const cellPattern = new RegExp(`<c\\s+r="${cellRef}"[^>]*(?:/>|>(.*?)</c>)`, "s");
  const match = xml.match(cellPattern);
  if (!match) return null;

  const cellContent = match[1] || "";

  // Check for shared string type
  const typeMatch = match[0].match(/\bt="([^"]*)"/);
  const cellType = typeMatch ? typeMatch[1] : null;

  // Extract <v> value
  const vMatch = cellContent.match(/<v>(.*?)<\/v>/s);
  if (!vMatch) return null;

  const raw = vMatch[1].trim();

  if (cellType === "inlineStr") {
    const isMatch = cellContent.match(/<is><t[^>]*>(.*?)<\/t><\/is>/s);
    if (isMatch) return decodeXmlEntities(isMatch[1]);
    return decodeXmlEntities(raw);
  }

  if (cellType === "s") {
    // Shared string — resolve index to actual text
    const idx = parseInt(raw, 10);
    if (sharedStrings.length > 0 && idx >= 0 && idx < sharedStrings.length) {
      return sharedStrings[idx];
    }
    return raw; // fallback if no shared strings table provided
  }

  if (cellType === "b") return raw === "1";
  if (cellType === "str") return decodeXmlEntities(raw); // formula result is a string

  // Numeric or date
  const num = parseFloat(raw);
  return isNaN(num) ? raw : num;
}

function hasLibreOffice() {
  try {
    getLibreOffice();
    return true;
  } catch {
    return false;
  }
}

// ── Helpers for multi-file recalculation ────────────────────────────────────

function xslRoundtrip(soffice, userProfile, workDir, xlsxPath) {
  const xlsName = basename(xlsxPath).replace(".xlsx", ".xls");
  execSync(
    `"${soffice}" --headless --norestore --calc -env:UserInstallation="${userProfile}" --convert-to xls --outdir "${workDir}" "${xlsxPath}"`,
    { stdio: "pipe", timeout: 60000 },
  );
  const xlsPath = resolve(workDir, xlsName);
  if (existsSync(xlsPath)) {
    execSync(
      `"${soffice}" --headless --norestore --calc -env:UserInstallation="${userProfile}" --convert-to xlsx --outdir "${workDir}" "${xlsPath}"`,
      { stdio: "pipe", timeout: 60000 },
    );
  }
}

// Update external link caches in hub file with values from recalculated leaf files.
// External links in xlsx are stored in xl/externalLinks/externalLinkN.xml with
// cached cell values. The corresponding .rels file maps each link to a target file.
async function updateExternalLinkCaches(workDir, hubFile) {
  const hubPath = resolve(workDir, hubFile);
  const hubZip = await JSZip.loadAsync(readFileSync(hubPath));

  // Find all external links and their target files
  const linkFiles = Object.keys(hubZip.files).filter((f) => f.match(/xl\/externalLinks\/externalLink\d+\.xml$/));
  const relsFiles = Object.keys(hubZip.files).filter((f) => f.match(/xl\/externalLinks\/_rels\/externalLink\d+\.xml\.rels$/));

  for (const relsPath of relsFiles) {
    const relsXml = await hubZip.file(relsPath).async("string");
    // Find the relative target filename (second Target attribute, without path)
    const targets = [...relsXml.matchAll(/Target="([^"]+)"/g)].map((m) => m[1]);
    const relativeTarget = targets.find((t) => !t.includes("/") && !t.includes("%"));
    if (!relativeTarget) continue;

    // Find the corresponding externalLink XML
    const linkNum = relsPath.match(/externalLink(\d+)/)[1];
    const linkPath = `xl/externalLinks/externalLink${linkNum}.xml`;
    if (!hubZip.files[linkPath]) continue;

    // Load the recalculated leaf file
    const leafPath = resolve(workDir, relativeTarget);
    if (!existsSync(leafPath)) continue;

    const leafZip = await JSZip.loadAsync(readFileSync(leafPath));
    const leafSheetMap = await buildSheetMap(leafZip);

    // Parse the external link XML and update cached values
    let linkXml = await hubZip.file(linkPath).async("string");

    // External link XML has <sheetNames> listing sheets by index, and
    // <sheetData sheetId="N"> with cached values. sheetId is the sequential
    // index into <sheetNames>, NOT the workbook's sheetId attribute.
    const sheetNames = [...linkXml.matchAll(/<sheetName val="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

    const sheetDataPattern = /<sheetData sheetId="(\d+)">([\s\S]*?)<\/sheetData>/g;
    let match;
    const replacements = [];

    while ((match = sheetDataPattern.exec(linkXml)) !== null) {
      const sheetId = match[1];
      const oldSheetData = match[2];

      // Map sequential sheetId to sheet name from <sheetNames>
      const sheetName = sheetNames[parseInt(sheetId, 10)];
      if (!sheetName) continue;

      const leafSheetPath = leafSheetMap.get(sheetName);
      if (!leafSheetPath) continue;

      const leafXml = await leafZip.file(leafSheetPath).async("string");

      // Extract cell references from the cached data and read fresh values
      const cellPattern = /<cell r="([A-Z]+\d+)"[^>]*(?:\/>|>[\s\S]*?<\/cell>)/g;
      let cellMatch;
      let newSheetData = oldSheetData;

      while ((cellMatch = cellPattern.exec(oldSheetData)) !== null) {
        const cellRef = cellMatch[1];
        const freshValue = readCellValue(leafXml, cellRef);
        if (freshValue !== null && typeof freshValue === "number") {
          // Replace the cached value
          const oldCell = cellMatch[0];
          const newCell = `<cell r="${cellRef}"><v>${freshValue}</v></cell>`;
          newSheetData = newSheetData.replace(oldCell, newCell);
        }
      }

      replacements.push({ sheetId, oldSheetData, newSheetData });
    }

    for (const { sheetId, oldSheetData, newSheetData } of replacements) {
      linkXml = linkXml.replace(
        `<sheetData sheetId="${sheetId}">${oldSheetData}</sheetData>`,
        `<sheetData sheetId="${sheetId}">${newSheetData}</sheetData>`,
      );
    }

    const origDate = hubZip.file(linkPath).date;
    hubZip.file(linkPath, linkXml, { date: origDate });
  }

  // Write back the updated hub file
  const outBuffer = await hubZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 1 },
  });
  writeFileSync(hubPath, outBuffer);
}

// ── Multi-file: write data, recalculate across files, read results ──────────
//
// For multi-file products like Self Employed where cross-file external links
// must resolve. All xlsx files are placed in the same directory so relative
// external link paths work.
//
// @param {Object} fileBuffers - { "Sales.xlsx": Buffer, "Purchases.xlsx": Buffer, "Financialaccounts.xlsx": Buffer, ... }
// @param {Object} fileWrites - { "Sales.xlsx": { "Apr": { "A5": value, ... } }, "Purchases.xlsx": { ... } }
// @param {Object} cellReads - { "Profit & Loss Account": ["C5", ...], ... } — reads from the readFile
// @param {string} readFile - filename to read results from (e.g. "Financialaccounts.xlsx")
// @param {Object} [options] - { saveRecalculatedTo: "/path/to/dir" }
// @returns {Object} - { "SheetName": { "A1": value, ... }, ... }

export async function runMultiFileSpreadsheet(fileBuffers, fileWrites, cellReads, readFile, options = {}) {
  const soffice = getLibreOffice();
  const workDir = resolve(tmpdir(), `spreadsheet-multi-${randomBytes(4).toString("hex")}`);
  mkdirSync(workDir, { recursive: true });

  try {
    // 1. Write all files to the work directory
    for (const [filename, buffer] of Object.entries(fileBuffers)) {
      const writes = fileWrites[filename];
      if (writes && Object.keys(writes).length > 0) {
        // This file has scenario data to inject
        const zip = await JSZip.loadAsync(buffer);
        const sheetMap = await buildSheetMap(zip);

        for (const [sheetName, cells] of Object.entries(writes)) {
          const sheetPath = sheetMap.get(sheetName);
          if (!sheetPath) throw new Error(`Sheet "${sheetName}" not found in ${filename}`);

          let xml = await zip.file(sheetPath).async("string");
          for (const [cellRef, value] of Object.entries(cells)) {
            if (typeof value === "string") {
              xml = setCellString(xml, cellRef, value);
            } else {
              xml = setCellValue(xml, cellRef, value);
            }
          }
          const originalDate = zip.file(sheetPath).date;
          zip.file(sheetPath, xml, { date: originalDate });
        }

        const outBuffer = await zip.generateAsync({
          type: "nodebuffer",
          compression: "DEFLATE",
          compressionOptions: { level: 1 },
        });
        writeFileSync(resolve(workDir, filename), outBuffer);
      } else {
        // Copy unchanged
        writeFileSync(resolve(workDir, filename), buffer);
      }
    }

    // 2. Recalculate via LibreOffice xls roundtrip
    // LibreOffice --convert-to doesn't resolve external links between files.
    // Strategy: recalculate leaf files first, then propagate their computed
    // totals into the hub file's external link cache before recalculating it.
    const userProfile = `file://${resolve(workDir, "lo_profile")}`;
    const filenames = Object.keys(fileBuffers);

    // Recalculate leaf files via xls roundtrip (xlsx → xls → xlsx).
    const leafFiles = filenames.filter((f) => f !== readFile);
    for (const filename of leafFiles) {
      if (!filename.endsWith(".xlsx")) continue;
      const xlsxPath = resolve(workDir, filename);
      if (!existsSync(xlsxPath)) continue;
      xslRoundtrip(soffice, userProfile, workDir, xlsxPath);
    }

    // Inject recalculated leaf values into hub's external link caches
    await updateExternalLinkCaches(workDir, readFile);

    // Recalculate the hub file
    xslRoundtrip(soffice, userProfile, workDir, resolve(workDir, readFile));

    // Recalculate files that read FROM the hub (e.g. Vat.xlsx) — they need fresh hub data
    if (options.postHubRecalc) {
      for (const filename of options.postHubRecalc) {
        const xlsxPath = resolve(workDir, filename);
        if (existsSync(xlsxPath)) {
          xslRoundtrip(soffice, userProfile, workDir, xlsxPath);
        }
      }
    }

    // 3. Read results from the specified readFile
    const recalcPath = resolve(workDir, readFile);
    const recalcBuffer = readFileSync(recalcPath);
    const recalcZip = await JSZip.loadAsync(recalcBuffer);
    const recalcSheetMap = await buildSheetMap(recalcZip);

    const sharedStrings = await loadSharedStrings(recalcZip);

    const results = {};
    for (const [sheetName, cellRefs] of Object.entries(cellReads)) {
      const sheetPath = recalcSheetMap.get(sheetName);
      if (!sheetPath) throw new Error(`Sheet "${sheetName}" not found in recalculated ${readFile}`);

      const xml = await recalcZip.file(sheetPath).async("string");
      results[sheetName] = {};

      for (const cellRef of cellRefs) {
        results[sheetName][cellRef] = readCellValue(xml, cellRef, sharedStrings);
      }
    }

    // Read from additional recalculated files (e.g. Vat.xlsx, Bank.xlsx)
    // options.additionalReads = { "Vat.xlsx": { "VATQtr1": ["G7","G15","G17"] }, "Bank.xlsx": { "Mar": ["A2"] } }
    if (options.additionalReads) {
      for (const [filename, sheetReads] of Object.entries(options.additionalReads)) {
        const filePath = resolve(workDir, filename);
        if (!existsSync(filePath)) continue;
        const fileZip = await JSZip.loadAsync(readFileSync(filePath));
        const fileSheetMap = await buildSheetMap(fileZip);
        const fileSharedStrings = await loadSharedStrings(fileZip);

        for (const [sheetName, cellRefs] of Object.entries(sheetReads)) {
          const sheetPath = fileSheetMap.get(sheetName);
          if (!sheetPath) continue;
          const xml = await fileZip.file(sheetPath).async("string");
          if (!results[sheetName]) results[sheetName] = {};
          for (const cellRef of cellRefs) {
            results[sheetName][cellRef] = readCellValue(xml, cellRef, fileSharedStrings);
          }
        }
      }
    }

    // Optionally save recalculated files
    if (options.saveRecalculatedTo) {
      mkdirSync(options.saveRecalculatedTo, { recursive: true });
      for (const filename of filenames) {
        cpSync(resolve(workDir, filename), resolve(options.saveRecalculatedTo, filename));
      }
    }

    return results;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

export { toExcelSerial, buildSheetMap, readCellValue, loadSharedStrings, getLibreOffice, hasLibreOffice };

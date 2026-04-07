// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd
//
// xlsx-exporter.js — Extract diya-gl data from populated xlsx packages.
// Reverse of cellWrites: reads transaction rows from Sales/Purchases sheets,
// maps code letters back to accountMainIDs, extracts metadata.

import JSZip from "jszip";
import { buildSheetMap, readCellValue, loadSharedStrings } from "./spreadsheet-runner.js";
import {
  BST_PURCHASE_CODE_MAP,
  SE_PURCHASE_CODE_MAP,
  LTD_PURCHASE_CODE_MAP,
  LTD_SALES_CODE_MAP,
  MONTH_ORDER,
} from "./scenario-extractor.js";

/**
 * Build reverse code map: { code → accountMainID }.
 * For codes that map from multiple accounts, uses the first (primary) account.
 */
export function buildReverseCodeMap(forwardMap) {
  const reverse = {};
  for (const [acctId, code] of Object.entries(forwardMap)) {
    if (!reverse[code]) reverse[code] = String(acctId);
  }
  return reverse;
}

// Reverse sales map: code → accountMainID
const REVERSE_SALES = buildReverseCodeMap(LTD_SALES_CODE_MAP);

/**
 * Check if a cell contains a formula (has <f> tag).
 */
function hasCellFormula(xml, cellRef) {
  const cellPattern = new RegExp(`<c\\s+r="${cellRef}"[^>]*(?:/>|>([\\s\\S]*?)</c>)`, "s");
  const match = xml.match(cellPattern);
  if (!match) return false;
  const cellContent = match[1] || "";
  return /<f[> ]/.test(cellContent);
}

/**
 * Convert Excel serial number to YYYY-MM-DD date string.
 */
function excelSerialToDate(serial) {
  // Excel epoch: 1900-01-01 = serial 1 (with the 1900 leap year bug: serial 60 = Feb 29 1900)
  const msPerDay = 86400000;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899
  const date = new Date(excelEpoch.getTime() + serial * msPerDay);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const BST_SALES_SHEETS = [
  "SalesApr",
  "SalesMay",
  "SalesJun",
  "SalesJul",
  "SalesAug",
  "SalesSep",
  "SalesOct",
  "SalesNov",
  "SalesDec",
  "SalesJan",
  "SalesFeb",
  "SalesMar",
];
const BST_PURCHASE_SHEETS = [
  "PurchasesApr",
  "PurchasesMay",
  "PurchasesJun",
  "PurchasesJul",
  "PurchasesAug",
  "PurchasesSep",
  "PurchasesOct",
  "PurchasesNov",
  "PurchasesDec",
  "PurchasesJan",
  "PurchasesFeb",
  "PurchasesMar",
];
const MONTH_SHEETS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

/**
 * Extract transaction lines from a single-file BST product.
 */
export async function extractBstTransactions(xlsxBuffer) {
  const zip = await JSZip.loadAsync(xlsxBuffer);
  const sheetMap = await buildSheetMap(zip);
  const sharedStrings = await loadSharedStrings(zip);
  const lines = [];
  let entryNum = 1;

  // Sales: rows 4+, A=date, B=customer, F=amount
  for (let mi = 0; mi < 12; mi++) {
    const sheetName = BST_SALES_SHEETS[mi];
    const sheetPath = sheetMap.get(sheetName);
    if (!sheetPath) continue;
    const xml = await zip.file(sheetPath).async("string");

    for (let row = 4; row <= 200; row++) {
      const dateVal = readCellValue(xml, `A${row}`, sharedStrings);
      const amount = readCellValue(xml, `F${row}`, sharedStrings);
      if (dateVal === null || amount === null || typeof amount !== "number") break;
      if (hasCellFormula(xml, `F${row}`)) continue;

      const customer = readCellValue(xml, `B${row}`, sharedStrings) || "";
      lines.push({
        sourceJournalID: "sales",
        postingDate: excelSerialToDate(dateVal),
        accountMainID: "4000",
        amount,
        detailComment: typeof customer === "string" ? customer : "",
        entryNumber: `EXP-${String(entryNum++).padStart(4, "0")}`,
      });
    }
  }

  // Purchases: rows 5+, A=date, B=supplier, E=code, G=amount
  const reversePurchase = buildReverseCodeMap(BST_PURCHASE_CODE_MAP);
  for (let mi = 0; mi < 12; mi++) {
    const sheetName = BST_PURCHASE_SHEETS[mi];
    const sheetPath = sheetMap.get(sheetName);
    if (!sheetPath) continue;
    const xml = await zip.file(sheetPath).async("string");

    for (let row = 5; row <= 200; row++) {
      const dateVal = readCellValue(xml, `A${row}`, sharedStrings);
      const amount = readCellValue(xml, `G${row}`, sharedStrings);
      if (dateVal === null || amount === null || typeof amount !== "number") break;
      if (hasCellFormula(xml, `G${row}`)) continue;

      const supplier = readCellValue(xml, `B${row}`, sharedStrings) || "";
      const code = readCellValue(xml, `E${row}`, sharedStrings) || "";
      const codeStr = typeof code === "string" ? code.toLowerCase() : String(code).toLowerCase();
      const accountMainID = reversePurchase[codeStr] || "5002";

      lines.push({
        sourceJournalID: "purchases",
        postingDate: excelSerialToDate(dateVal),
        accountMainID,
        amount,
        detailComment: typeof supplier === "string" ? supplier : "",
        entryNumber: `EXP-${String(entryNum++).padStart(4, "0")}`,
      });
    }
  }

  return lines;
}

/**
 * Extract transaction lines from a multi-file SE/Ltd product.
 */
export async function extractMultiFileTransactions(sourceDir, product) {
  const { readFileSync, readdirSync } = await import("fs");
  const { resolve } = await import("path");

  const reversePurchase = buildReverseCodeMap(product === "ltd" ? LTD_PURCHASE_CODE_MAP : SE_PURCHASE_CODE_MAP);
  // Ltd: E=code, F=amount; SE: F=code, G=amount
  const codeCol = product === "ltd" ? "E" : "F";
  const amountCol = product === "ltd" ? "F" : "G";
  const lines = [];
  let entryNum = 1;

  // Sales.xlsx: sheets Apr-Mar
  const salesPath = resolve(sourceDir, "Sales.xlsx");
  const salesZip = await JSZip.loadAsync(readFileSync(salesPath));
  const salesSheetMap = await buildSheetMap(salesZip);
  const salesStrings = await loadSharedStrings(salesZip);

  for (let mi = 0; mi < 12; mi++) {
    const sheetName = MONTH_SHEETS[mi];
    const sheetPath = salesSheetMap.get(sheetName);
    if (!sheetPath) continue;
    const xml = await salesZip.file(sheetPath).async("string");

    for (let row = 5; row <= 300; row++) {
      const dateVal = readCellValue(xml, `A${row}`, salesStrings);
      const amount = readCellValue(xml, `${amountCol}${row}`, salesStrings);
      if (dateVal === null || amount === null || typeof amount !== "number") break;
      if (hasCellFormula(xml, `${amountCol}${row}`)) continue;

      const customer = readCellValue(xml, `B${row}`, salesStrings) || "";
      const code = readCellValue(xml, `${codeCol}${row}`, salesStrings) || "a";
      const codeStr = typeof code === "string" ? code.toLowerCase() : String(code).toLowerCase();
      const accountMainID = REVERSE_SALES[codeStr] || "4000";

      lines.push({
        sourceJournalID: "sales",
        postingDate: excelSerialToDate(dateVal),
        accountMainID,
        amount,
        detailComment: typeof customer === "string" ? customer : "",
        entryNumber: `EXP-${String(entryNum++).padStart(4, "0")}`,
        taxRate: 0.2,
      });
    }
  }

  // Purchases.xlsx: sheets Apr-Mar
  const purchasesPath = resolve(sourceDir, "Purchases.xlsx");
  const purchasesZip = await JSZip.loadAsync(readFileSync(purchasesPath));
  const purchasesSheetMap = await buildSheetMap(purchasesZip);
  const purchasesStrings = await loadSharedStrings(purchasesZip);

  for (let mi = 0; mi < 12; mi++) {
    const sheetName = MONTH_SHEETS[mi];
    const sheetPath = purchasesSheetMap.get(sheetName);
    if (!sheetPath) continue;
    const xml = await purchasesZip.file(sheetPath).async("string");

    for (let row = 5; row <= 300; row++) {
      const dateVal = readCellValue(xml, `A${row}`, purchasesStrings);
      const amount = readCellValue(xml, `${amountCol}${row}`, purchasesStrings);
      if (dateVal === null || amount === null || typeof amount !== "number") break;
      if (hasCellFormula(xml, `${amountCol}${row}`)) continue;

      const supplier = readCellValue(xml, `B${row}`, purchasesStrings) || "";
      const code = readCellValue(xml, `${codeCol}${row}`, purchasesStrings) || "";
      const codeStr = typeof code === "string" ? code.toLowerCase() : String(code).toLowerCase();
      const accountMainID = reversePurchase[codeStr] || "5002";

      lines.push({
        sourceJournalID: "purchases",
        postingDate: excelSerialToDate(dateVal),
        accountMainID,
        amount,
        detailComment: typeof supplier === "string" ? supplier : "",
        entryNumber: `EXP-${String(entryNum++).padStart(4, "0")}`,
        taxRate: 0.2,
      });
    }
  }

  return lines;
}

// Bank file → account ID mapping per product
const BANK_FILES = {
  se: [
    { file: "Bank.xlsx", accountID: "1200" },
    { file: "Cash.xlsx", accountID: "1220" },
  ],
  ltd: [
    { file: "Currentaccount.xlsx", accountID: "1200" },
    { file: "Savingaccount.xlsx", accountID: "1210" },
    { file: "Cashaccount.xlsx", accountID: "1220" },
    { file: "Creditcardaccount.xlsx", accountID: "1230" },
  ],
};

/**
 * Extract bank transactions from multi-file SE/Ltd product.
 * Receipts: rows 6+, A=date, B=source, E=code, F=amount
 * Payments: rows 6+, P=date, Q=supplier, S=code, T=amount
 * Opening balance: A1 (code "BC")
 */
export async function extractBankTransactions(sourceDir, product) {
  const { readFileSync, existsSync } = await import("fs");
  const { resolve } = await import("path");

  const bankFiles = BANK_FILES[product] || BANK_FILES.se;
  const lines = [];
  let entryNum = 1;

  for (const { file, accountID } of bankFiles) {
    const filePath = resolve(sourceDir, file);
    if (!existsSync(filePath)) continue;

    const zip = await JSZip.loadAsync(readFileSync(filePath));
    const sheetMap = await buildSheetMap(zip);
    const sharedStrings = await loadSharedStrings(zip);
    let obEmitted = false;

    for (let mi = 0; mi < 12; mi++) {
      const sheetName = MONTH_SHEETS[mi];
      const sheetPath = sheetMap.get(sheetName);
      if (!sheetPath) continue;
      const xml = await zip.file(sheetPath).async("string");

      // Opening balance in A1 (can appear in any sheet — cellWrites places it in the month of the BC date)
      // Skip if A1 is a formula (carry-forward from template, not injected data)
      const obVal = readCellValue(xml, "A1", sharedStrings);
      if (obVal !== null && typeof obVal === "number" && obVal !== 0 && !obEmitted && !hasCellFormula(xml, "A1")) {
        const firstDate = readCellValue(xml, "A6", sharedStrings);
        if (firstDate !== null && typeof firstDate === "number" && firstDate > 1) {
          lines.push({
            "sourceJournalID": "bank",
            "postingDate": excelSerialToDate(firstDate),
            "accountMainID": accountID,
            "amount": obVal,
            "detailComment": "Opening balance",
            "diya-gl:bankCode": "BC",
            "diya-gl:bankAccountID": accountID,
            "entryNumber": `EXP-${String(entryNum++).padStart(4, "0")}`,
          });
          obEmitted = true;
        }
      }

      // Receipts: rows 6+, A=date, B=source, E=code, F=amount
      for (let row = 6; row <= 200; row++) {
        const dateVal = readCellValue(xml, `A${row}`, sharedStrings);
        const amount = readCellValue(xml, `F${row}`, sharedStrings);
        if (dateVal === null || amount === null || typeof amount !== "number") break;
        if (hasCellFormula(xml, `F${row}`)) break;

        const source = readCellValue(xml, `B${row}`, sharedStrings) || "";
        const code = readCellValue(xml, `E${row}`, sharedStrings) || "";
        const codeStr = typeof code === "string" ? code : String(code);

        lines.push({
          "sourceJournalID": "bank",
          "postingDate": excelSerialToDate(dateVal),
          "accountMainID": accountID,
          amount,
          "detailComment": typeof source === "string" ? source : "",
          "diya-gl:bankCode": codeStr,
          "diya-gl:bankAccountID": accountID,
          "entryNumber": `EXP-${String(entryNum++).padStart(4, "0")}`,
        });
      }

      // Payments: rows 6+, P=date, Q=supplier, S=code, T=amount
      for (let row = 6; row <= 200; row++) {
        const dateVal = readCellValue(xml, `P${row}`, sharedStrings);
        const amount = readCellValue(xml, `T${row}`, sharedStrings);
        if (dateVal === null || amount === null || typeof amount !== "number") break;
        if (hasCellFormula(xml, `T${row}`)) break;

        const supplier = readCellValue(xml, `Q${row}`, sharedStrings) || "";
        const code = readCellValue(xml, `S${row}`, sharedStrings) || "";
        const codeStr = typeof code === "string" ? code : String(code);

        lines.push({
          "sourceJournalID": "bank",
          "postingDate": excelSerialToDate(dateVal),
          "accountMainID": accountID,
          amount,
          "detailComment": typeof supplier === "string" ? supplier : "",
          "diya-gl:bankCode": codeStr,
          "diya-gl:bankAccountID": accountID,
          "entryNumber": `EXP-${String(entryNum++).padStart(4, "0")}`,
        });
      }
    }
  }

  return lines;
}

/**
 * Extract payroll transactions from Payslips.xlsx monthly tabs.
 * Monthly payroll rows 51-55: F=name, M=gross, N=tax, O=empNI, R=net, S=erNI
 */
export async function extractPayrollTransactions(sourceDir) {
  const { readFileSync, existsSync } = await import("fs");
  const { resolve } = await import("path");

  const filePath = resolve(sourceDir, "Payslips.xlsx");
  if (!existsSync(filePath)) return [];

  const zip = await JSZip.loadAsync(readFileSync(filePath));
  const sheetMap = await buildSheetMap(zip);
  const sharedStrings = await loadSharedStrings(zip);
  const lines = [];
  let entryNum = 1;

  for (let mi = 0; mi < 12; mi++) {
    const sheetName = MONTH_SHEETS[mi];
    const sheetPath = sheetMap.get(sheetName);
    if (!sheetPath) continue;
    const xml = await zip.file(sheetPath).async("string");

    for (let row = 51; row <= 55; row++) {
      const grossPay = readCellValue(xml, `M${row}`, sharedStrings);
      if (grossPay === null || typeof grossPay !== "number" || grossPay === 0) continue;

      const name = readCellValue(xml, `F${row}`, sharedStrings) || "";
      const incomeTax = readCellValue(xml, `N${row}`, sharedStrings) || 0;
      const employeeNI = readCellValue(xml, `O${row}`, sharedStrings) || 0;
      const netPay = readCellValue(xml, `R${row}`, sharedStrings) || 0;
      const employerNI = readCellValue(xml, `S${row}`, sharedStrings) || 0;

      // Derive posting date from month tab (last day of that month, approximate from other data)
      // Use the date from row 49 col M (date wages paid) if available
      const wageDate = readCellValue(xml, "M49", sharedStrings);
      const postingDate =
        wageDate && typeof wageDate === "number" && wageDate > 1 ? excelSerialToDate(wageDate) : `${MONTH_SHEETS[mi]}-unknown`;

      lines.push({
        "sourceJournalID": "payroll",
        postingDate,
        "accountMainID": "5101",
        "amount": grossPay,
        "detailComment": typeof name === "string" ? name : "",
        "diya-gl:grossPay": grossPay,
        "diya-gl:incomeTax": typeof incomeTax === "number" ? incomeTax : 0,
        "diya-gl:employeeNI": typeof employeeNI === "number" ? employeeNI : 0,
        "diya-gl:employerNI": typeof employerNI === "number" ? employerNI : 0,
        "diya-gl:netPay": typeof netPay === "number" ? netPay : 0,
        "entryNumber": `EXP-${String(entryNum++).padStart(4, "0")}`,
      });
    }
  }

  return lines;
}

// OpenAccounts cell → journal entry mapping for Ltd
const OA_JOURNAL_MAP = [
  { cell: "D16", accountMainID: "1200", dc: "D", comment: "Current account opening balance" },
  { cell: "H16", accountMainID: "1210", dc: "D", comment: "Savings account opening balance" },
  { cell: "J16", accountMainID: "1220", dc: "D", comment: "Cash account opening balance" },
  { cell: "I16", accountMainID: "1230", dc: "D", comment: "Credit card account opening balance" },
  { cell: "K12", accountMainID: "0040", dc: "D", comment: "Motor vehicle net book value" },
  { cell: "J12", accountMainID: "0030", dc: "D", comment: "Computer equipment net book value" },
  { cell: "D14", accountMainID: "1100", dc: "D", comment: "Opening stock" },
  { cell: "D15", accountMainID: "1300", dc: "D", comment: "Trade debtors" },
  { cell: "D19", accountMainID: "2100", dc: "C", comment: "Trade creditors" },
  { cell: "D20", accountMainID: "2300", dc: "C", comment: "Corporation Tax liability" },
  { cell: "D24", accountMainID: "2200", dc: "C", comment: "VAT liability" },
  { cell: "D29", accountMainID: "3000", dc: "C", comment: "Share capital" },
  { cell: "D30", accountMainID: "3100", dc: "C", comment: "Retained earnings" },
  { cell: "D31", accountMainID: "2500", dc: "C", comment: "Directors loan" },
];

/**
 * Extract journal entries (opening balances) from OpenAccounts sheet.
 */
export async function extractJournalEntries(sourceDir, product) {
  if (product !== "ltd") return []; // Only Ltd has OpenAccounts

  const { readFileSync, existsSync } = await import("fs");
  const { resolve } = await import("path");

  const hubPath = resolve(sourceDir, "Financialaccounts.xlsx");
  if (!existsSync(hubPath)) return [];

  const zip = await JSZip.loadAsync(readFileSync(hubPath));
  const sheetMap = await buildSheetMap(zip);
  const sharedStrings = await loadSharedStrings(zip);

  const oaPath = sheetMap.get("OpenAccounts");
  if (!oaPath) return [];
  const xml = await zip.file(oaPath).async("string");

  const lines = [];
  let entryNum = 1;

  for (const mapping of OA_JOURNAL_MAP) {
    const val = readCellValue(xml, mapping.cell, sharedStrings);
    if (val === null || typeof val !== "number" || val === 0) continue;

    lines.push({
      sourceJournalID: "journal",
      postingDate: "2025-04-01", // Opening balance date — will be normalised on double-roundtrip
      accountMainID: mapping.accountMainID,
      amount: Math.abs(val),
      detailComment: "Opening balances",
      lineItemComment: mapping.comment,
      debitCreditCode: mapping.dc,
      entryNumber: `EXP-${String(entryNum++).padStart(4, "0")}`,
    });
  }

  return lines;
}

/**
 * Extract business metadata from a populated xlsx.
 */
export async function extractMetadata(xlsxBuffer, product) {
  const zip = await JSZip.loadAsync(xlsxBuffer);
  const sheetMap = await buildSheetMap(zip);
  const sharedStrings = await loadSharedStrings(zip);

  const sheet = product === "ltd" ? "OpenAccounts" : "Business Details";
  const path = sheetMap.get(sheet);
  if (!path) return {};

  const xml = await zip.file(path).async("string");

  if (product === "ltd") {
    return {
      organizationIdentifier: readCellValue(xml, "E2", sharedStrings) || "",
      organizationDescription: "",
      companyNumber: readCellValue(xml, "E3", sharedStrings) || "",
    };
  }

  return {
    organizationIdentifier: readCellValue(xml, "C5", sharedStrings) || "",
    organizationDescription: readCellValue(xml, "C7", sharedStrings) || "",
  };
}

/**
 * Normalise a line for comparison (sort-stable fields only).
 */
export function normaliseLine(line) {
  return {
    sourceJournalID: line.sourceJournalID,
    postingDate: line.postingDate,
    accountMainID: String(line.accountMainID),
    amount: Math.round(line.amount * 100) / 100,
    detailComment: line.detailComment || "",
  };
}

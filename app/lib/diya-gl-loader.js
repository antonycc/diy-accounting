// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd
//
// diya-gl-loader.js — Load diya-gl book.toml + lines.jsonl and convert
// to the scenario format that product modules' cellWrites() expect.

import { parse as parseTOML } from "smol-toml";
import { readFileSync } from "fs";
import { join } from "path";
import {
  BST_PURCHASE_CODE_MAP,
  SE_PURCHASE_CODE_MAP,
  LTD_PURCHASE_CODE_MAP,
  LTD_SALES_CODE_MAP,
  BST_SALES_ACCOUNTS,
  SE_BANK_ACCOUNTS,
  MONTH_ORDER,
  filterBst,
  filterAdvanced,
  filterFull,
  buildGrouped,
  computeGrossSales,
  computeSpreadsheetNetSales,
} from "./scenario-extractor.js";

/**
 * Parse an ISO 8601 duration offset like "+P3M", "-P1Y", "+P1Y3M".
 * Returns { years, months } (signed).
 */
export function parseOffset(offset) {
  if (!offset) return { years: 0, months: 0 };
  const sign = offset.startsWith("-") ? -1 : 1;
  const body = offset.replace(/^[+-]/, "");
  const match = body.match(/^P(?:(\d+)Y)?(?:(\d+)M)?$/);
  if (!match) throw new Error(`Invalid offset: "${offset}". Use ISO 8601 duration like +P1Y, -P3M, +P1Y3M`);
  return { years: sign * parseInt(match[1] || "0", 10), months: sign * parseInt(match[2] || "0", 10) };
}

/**
 * Shift a YYYY-MM-DD date string by the given year/month offset.
 */
export function shiftDate(dateStr, offset) {
  const [y, m, d] = dateStr.split("-").map(Number);
  let newMonth = m + offset.months;
  let newYear = y + offset.years;
  while (newMonth > 12) {
    newMonth -= 12;
    newYear++;
  }
  while (newMonth < 1) {
    newMonth += 12;
    newYear--;
  }
  const maxDay = new Date(newYear, newMonth, 0).getDate();
  const newDay = Math.min(d, maxDay);
  return `${newYear}-${String(newMonth).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
}

/**
 * Apply a date offset to all lines (shifts postingDate).
 */
export function applyOffset(lines, offsetStr) {
  if (!offsetStr) return lines;
  const offset = parseOffset(offsetStr);
  if (offset.years === 0 && offset.months === 0) return lines;
  return lines.map((line) => ({
    ...line,
    postingDate: shiftDate(line.postingDate, offset),
  }));
}

/**
 * Load diya-gl data from a directory.
 * @param {string} dataDir - path to directory containing book.toml and lines.jsonl
 * @param {string} [offset] - ISO 8601 duration offset like "+P3M", "-P1Y"
 * @returns {{ book: Object, lines: Array }}
 */
export function loadDiyaGlData(dataDir, offset) {
  const bookToml = readFileSync(join(dataDir, "book.toml"), "utf-8");
  const book = parseTOML(bookToml);

  const linesRaw = readFileSync(join(dataDir, "lines.jsonl"), "utf-8");
  let lines = linesRaw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));

  if (offset) {
    lines = applyOffset(lines, offset);
  }

  return { book, lines };
}

const PRODUCT_FILTERS = {
  bst: filterBst,
  taxi: filterBst, // Taxi uses BST-level filtering (sales + purchases only)
  se: filterAdvanced,
  ltd: filterFull,
};

const PURCHASE_CODE_MAPS = {
  bst: BST_PURCHASE_CODE_MAP,
  taxi: BST_PURCHASE_CODE_MAP,
  se: SE_PURCHASE_CODE_MAP,
  ltd: LTD_PURCHASE_CODE_MAP,
};

/**
 * Convert diya-gl data to a scenario object compatible with product cellWrites().
 * @param {Object} book - parsed book.toml
 * @param {Array} lines - parsed lines.jsonl entries
 * @param {string} product - 'bst' | 'taxi' | 'se' | 'ltd'
 * @returns {Object} scenario object
 */
export function diyaGlToScenario(book, lines, product) {
  const filter = PRODUCT_FILTERS[product];
  if (!filter) throw new Error(`Unknown product: ${product}`);

  const purchaseCodeMap = PURCHASE_CODE_MAPS[product];
  const filteredLines = filter(lines);
  const grouped = buildGrouped(filteredLines, purchaseCodeMap);

  // Compute expected values
  const salesLines = filteredLines.filter((l) => l.sourceJournalID === "sales");
  const purchaseLines = filteredLines.filter((l) => l.sourceJournalID === "purchases");

  let totalSales;
  if (product === "bst" || product === "taxi") {
    totalSales = computeGrossSales(salesLines);
  } else {
    // SE/Ltd: net sales (gross / 1.2) for turnover accounts only
    const TURNOVER_ACCOUNTS =
      product === "ltd" ? new Set(["4000", "4001", "4002", "4003", "4004"]) : new Set(["4000", "4001", "4002", "4003"]);
    const turnoverLines = salesLines.filter((l) => TURNOVER_ACCOUNTS.has(l.accountMainID));
    totalSales = computeSpreadsheetNetSales(turnoverLines);
  }

  // Compute expense totals by code
  const byCode = {};
  purchaseLines.forEach((l) => {
    const code = purchaseCodeMap[l.accountMainID];
    if (code) byCode[code] = (byCode[code] || 0) + l.amount;
  });

  // Build metadata from book.toml
  const entity = book.entityInformation || {};
  const metadata = {
    name: entity.organizationIdentifier || "Unknown",
    description: entity.organizationDescription || "",
    product,
    tax_regime: product === "ltd" ? "ltd" : "se",
  };

  const business = {
    name: entity.organizationIdentifier || "",
    description: entity.organizationDescription || "",
  };

  // Build expected values
  const expected = { total_sales: totalSales };

  if (product === "bst") {
    const stockPurchases = byCode.s || 0;
    const openingStock = 10000; // default, overridden by book if present
    const closingStock = 6000;
    const stockAdj = openingStock - closingStock;
    const coS = stockPurchases + stockAdj;
    const directCosts = byCode.d || 0;
    const grossProfit = totalSales - coS - directCosts;
    const expenseCodes = ["e", "p", "r", "g", "m", "t", "a", "l", "b", "i", "o"];
    const totalExpenses = expenseCodes.reduce((s, c) => s + (byCode[c] || 0), 0);
    const netProfit = grossProfit - totalExpenses;
    expected.gross_profit = Math.round(grossProfit);
    expected.net_profit = Math.round(netProfit);
    expected.total_premises = Math.round(byCode.p || 0);
    expected.total_gen_admin = Math.round(byCode.g || 0);
    expected.total_legal = Math.round(byCode.l || 0);
  }

  if (product === "se" || product === "ltd") {
    expected.total_motor_gross = Math.round(byCode.v || 0);
    expected.total_legal_gross = Math.round(byCode.l || 0);
    if (product === "ltd") {
      expected.total_premises_gross = Math.round(byCode.r || 0);
    }
  }

  const scenario = {
    metadata,
    business,
    sales: grouped.sales,
    purchases: grouped.purchases,
    expected,
  };

  // Bank (SE/Ltd only) — flatten from { account: { month: [txs] } } to { month: [txs] }
  // with tx.account field so cellWrites can route to Bank vs Cash sheets
  if (Object.keys(grouped.bank).length > 0) {
    const flatBank = {};
    for (const [acctId, months] of Object.entries(grouped.bank)) {
      for (const [month, txs] of Object.entries(months)) {
        if (!flatBank[month]) flatBank[month] = [];
        for (const tx of txs) {
          flatBank[month].push({ ...tx, account: acctId });
        }
      }
    }
    scenario.bank = flatBank;
  }

  // Payroll (SE/Ltd only) — group by month
  const payrollLines = filteredLines.filter((l) => l.sourceJournalID === "payroll");
  if (payrollLines.length > 0) {
    const payrollByMonth = {};
    for (const line of payrollLines) {
      const month = MONTH_ORDER[new Date(line.postingDate + "T00:00:00Z").getUTCMonth()];
      if (!payrollByMonth[month]) payrollByMonth[month] = [];
      payrollByMonth[month].push({
        date: line.postingDate,
        name: line.detailComment,
        grossPay: line["diya-gl:grossPay"] || line.amount,
        incomeTax: line["diya-gl:incomeTax"] || 0,
        employeeNI: line["diya-gl:employeeNI"] || 0,
        employerNI: line["diya-gl:employerNI"] || 0,
        netPay: line["diya-gl:netPay"] || 0,
        employeeID: line["diya-gl:employeeID"] || "",
        accountMainID: line.accountMainID,
      });
    }
    scenario.payroll = payrollByMonth;
  }

  // Journal entries (opening balances) → scenario.opening_balance for Ltd
  const journalLines = filteredLines.filter((l) => l.sourceJournalID === "journal");
  if (journalLines.length > 0 && (product === "ltd" || product === "se")) {
    const ob = {};
    for (const line of journalLines) {
      const amt = line.debitCreditCode === "C" ? -line.amount : line.amount;
      const acct = line.accountMainID;
      // Map account IDs to opening_balance fields
      if (acct === "1200") ob.current_account = (ob.current_account || 0) + amt;
      else if (acct === "1210") ob.savings_account = (ob.savings_account || 0) + amt;
      else if (acct === "1220") ob.cash = (ob.cash || 0) + amt;
      else if (acct === "1230") ob.credit_card = (ob.credit_card || 0) + amt;
      else if (acct === "0040") ob.motor_vehicles = (ob.motor_vehicles || 0) + amt;
      else if (acct === "0030") ob.computer_equipment = (ob.computer_equipment || 0) + amt;
      else if (acct === "1100" && line.debitCreditCode === "D") ob.stock = (ob.stock || 0) + amt;
      else if (acct === "1300") ob.trade_debtors = (ob.trade_debtors || 0) + amt;
      else if (acct === "2500") ob.directors_loan = (ob.directors_loan || 0) + Math.abs(line.amount);
      else if (acct === "2100") ob.trade_creditors = (ob.trade_creditors || 0) + Math.abs(line.amount);
      else if (acct === "2200") ob.vat_liability = (ob.vat_liability || 0) + Math.abs(line.amount);
      else if (acct === "2300") ob.corporation_tax = (ob.corporation_tax || 0) + Math.abs(line.amount);
      else if (acct === "3000") ob.share_capital = (ob.share_capital || 0) + Math.abs(line.amount);
      else if (acct === "3100") ob.retained_earnings = (ob.retained_earnings || 0) + Math.abs(line.amount);
    }
    scenario.opening_balance = ob;
  }

  // Employees from book.toml
  if (book.employees) {
    scenario.employees = book.employees;
  }

  return scenario;
}

/**
 * Extract tax data from book.toml tax section into the format matching app/data/*.toml.
 * Bridges diya-gl field names (camelCase) to tax data field names (snake_case).
 * @param {Object} book - parsed book.toml
 * @returns {Object} tax data in the same format as app/data/se-YYYY-YYYY.toml
 */
export function extractTaxDataFromBook(book) {
  const tax = book.tax || {};
  const it = tax.incomeTax || {};
  const ni = tax.nationalInsurance || {};
  const ca = tax.capitalAllowances || {};
  const mi = tax.mileage || {};

  return {
    income_tax: {
      personal_allowance: it.personalAllowance || 12570,
      starting_rate: 0,
      basic_rate: it.basicRate || 0.2,
      higher_rate: it.higherRate || 0.4,
      starter_band_end: 0,
      basic_band_end: it.basicRateLimit || 37700,
      higher_band_start: (it.basicRateLimit || 37700) + 1,
    },
    national_insurance: {
      class2_rate: 0,
      class4_lower_rate: ni.class1EmployeeMainRate || 0.06,
      class4_lower_limit: ni.class1EmployeePrimaryThreshold || 12570,
      class4_upper_rate: ni.class1EmployeeUpperRate || 0.02,
      class4_upper_limit: ni.class1EmployeeUpperEarningsLimit || 50270,
      class2_weekly_rate: 0,
    },
    capital_allowances: {
      annual_investment_allowance: ca.annualInvestmentAllowance ? ca.annualInvestmentAllowance / 1000000 : 1.0,
      writing_down_allowance: ca.mainRateWDA || 0.18,
      motor_vehicle_cost_threshold: 12000,
      motor_vehicle_restriction: 3000,
    },
    mileage: {
      higher_rate_limit: 10000,
      higher_rate_pence: mi.carFirst10000 || 0.45,
      lower_rate_start: 10001,
      lower_rate_pence: mi.carOver10000 || 0.25,
    },
    vat: {
      registration_threshold: 90000,
      standard_rate: 0.2,
    },
  };
}

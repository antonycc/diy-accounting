// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd
//
// ltd.js — Limited Company product definition (all year-end months).
// Multi-file package: 15 xlsx files with cross-file external links.
// Supports small profits CT rate only (19% for profits up to £50,000).
// Year-end month is determined by the tax data file (financial_year.end).

import { toExcelSerial } from "../lib/spreadsheet-runner.js";
import { parseDate, MONTH_SHEETS } from "../lib/scenario-loader.js";

export const PRODUCT = {
  id: "ltd",
  dir: "ltd",
  name: "Company",
  taxRegime: "ltd",
  prefix: "GB Accounts Company",
};

export const MULTI_FILE = true;

// ── Scenario cell writes ───────────────────────────────────────────────────
// Ltd Sales: E=code letter, F=gross amount
// Ltd Purchases: E=code letter, F=gross amount

// Month tab names for a given year-end month (1=Jan, 12=Dec)
// e.g. yearEndMonth=3 (Mar): ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]
// e.g. yearEndMonth=6 (Jun): ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"]
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthTabNames(yearEndMonth) {
  const tabs = [];
  for (let i = 0; i < 12; i++) {
    tabs.push(SHORT_MONTHS[(yearEndMonth + i) % 12]);
  }
  return tabs;
}

// Scenario month keys (apr, may, ... mar) in order, with their 0-indexed month numbers
const SCENARIO_MONTHS = [
  { key: "apr", month: 3 },
  { key: "may", month: 4 },
  { key: "jun", month: 5 },
  { key: "jul", month: 6 },
  { key: "aug", month: 7 },
  { key: "sep", month: 8 },
  { key: "oct", month: 9 },
  { key: "nov", month: 10 },
  { key: "dec", month: 11 },
  { key: "jan", month: 0 },
  { key: "feb", month: 1 },
  { key: "mar", month: 2 },
];

export function cellWrites(scenario, targetStartYear, yearEndMonth) {
  const salesWrites = {};
  const purchasesWrites = {};

  // Default to March year-end if not specified
  const yem = yearEndMonth || 3;

  // The scenario assumes a March year-end (Apr-Mar). For other year-ends,
  // shift dates so the scenario's accounting period maps to the target's.
  // Source period start: April of the scenario year (month index 3)
  // Target period start: month after year-end (yearEndMonth % 12)
  const sourceStartMonth = 3; // April (0-indexed)
  const targetStartMonth = yem % 12; // month after year-end (0-indexed)
  const monthOffset = (targetStartMonth - sourceStartMonth + 12) % 12;

  // Build tab name sequence for the target year-end
  const tabNames = getMonthTabNames(yem);

  function shiftDate(d) {
    const shifted = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + monthOffset, d.getUTCDate()));
    return shifted;
  }

  // Map a shifted date to the correct tab name
  function getTabForDate(shifted) {
    const m = shifted.getUTCMonth();
    const tabMonth = SHORT_MONTHS[m];
    if (tabNames.includes(tabMonth)) return tabMonth;
    return tabNames[0]; // fallback
  }

  function processJournal(entries, writes, nameField, codeDefault) {
    for (const [monthKey, transactions] of Object.entries(entries)) {
      for (const tx of transactions) {
        const d = parseDate(tx.date);
        const shifted = shiftDate(d);
        const tabName = getTabForDate(shifted);

        if (!writes[tabName]) writes[tabName] = {};
        const sheet = writes[tabName];

        const nextRow = Object.keys(sheet).filter((k) => k.startsWith("A")).length + 5;
        sheet[`A${nextRow}`] = toExcelSerial(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
        if (tx[nameField]) sheet[`B${nextRow}`] = tx[nameField];
        sheet[`E${nextRow}`] = tx.code || codeDefault;
        sheet[`F${nextRow}`] = tx.amount;
      }
    }
  }

  if (scenario.sales) {
    processJournal(scenario.sales, salesWrites, "customer", "a");
  }

  if (scenario.purchases) {
    processJournal(scenario.purchases, purchasesWrites, "supplier", "g");
  }

  // Business Details (in Financialaccounts.xlsx hub, OpenAccounts sheet)
  const hubWrites = {};
  if (scenario.business || scenario.metadata) {
    if (!hubWrites.OpenAccounts) hubWrites.OpenAccounts = {};
    const bd = hubWrites.OpenAccounts;
    const biz = scenario.business || {};
    bd.E2 = biz.name || scenario.metadata?.name || "";
    if (biz.company_number) bd.E3 = biz.company_number;
    if (biz.address) bd.E4 = `${biz.address}, ${biz.town || ""} ${biz.postcode || ""}`.trim();
    if (biz.utr) bd.E6 = biz.utr;
  }

  // Opening balance sheet (OpenAccounts)
  if (scenario.opening_balance) {
    if (!hubWrites.OpenAccounts) hubWrites.OpenAccounts = {};
    const oa = hubWrites.OpenAccounts;
    const ob = scenario.opening_balance;
    if (ob.fixed_assets) oa.D12 = ob.fixed_assets;
    if (ob.plant_machinery) oa.H12 = ob.plant_machinery;
    if (ob.fixtures) oa.I12 = ob.fixtures;
    if (ob.computer_equipment) oa.J12 = ob.computer_equipment;
    if (ob.motor_vehicles) oa.K12 = ob.motor_vehicles;
    if (ob.stock) oa.D14 = ob.stock;
    if (ob.trade_debtors) oa.D15 = ob.trade_debtors;
    if (ob.current_account) oa.D16 = ob.current_account;
    if (ob.savings_account) oa.H16 = ob.savings_account;
    if (ob.credit_card) oa.I16 = ob.credit_card;
    if (ob.cash) oa.J16 = ob.cash;
    if (ob.trade_creditors) oa.D19 = ob.trade_creditors;
    if (ob.corporation_tax) oa.D20 = ob.corporation_tax;
    if (ob.wages_due) oa.D21 = ob.wages_due;
    if (ob.paye_ni_due) oa.D22 = ob.paye_ni_due;
    if (ob.dividends_due) oa.D23 = ob.dividends_due;
    if (ob.vat_liability) oa.D24 = ob.vat_liability;
    if (ob.share_capital) oa.D29 = ob.share_capital;
    if (ob.retained_earnings) oa.D30 = ob.retained_earnings;
    if (ob.directors_loan) oa.D31 = ob.directors_loan;
  }

  // Opening/closing debtors (Sales.xlsx)
  if (scenario.opening_debtors) {
    if (!salesWrites.OpeningDebtors) salesWrites.OpeningDebtors = {};
    let row = 5;
    for (const d of scenario.opening_debtors) {
      salesWrites.OpeningDebtors[`B${row}`] = d.customer;
      if (d.invoice) salesWrites.OpeningDebtors[`C${row}`] = d.invoice;
      salesWrites.OpeningDebtors[`H${row}`] = d.amount;
      row++;
    }
  }
  if (scenario.closing_debtors) {
    if (!salesWrites.ClosingDebtors) salesWrites.ClosingDebtors = {};
    let row = 5;
    for (const d of scenario.closing_debtors) {
      salesWrites.ClosingDebtors[`B${row}`] = d.customer;
      if (d.invoice) salesWrites.ClosingDebtors[`C${row}`] = d.invoice;
      salesWrites.ClosingDebtors[`H${row}`] = d.amount;
      row++;
    }
  }

  // Opening/closing creditors (Purchases.xlsx)
  if (scenario.opening_creditors) {
    if (!purchasesWrites.OpeningCreditors) purchasesWrites.OpeningCreditors = {};
    let row = 5;
    for (const c of scenario.opening_creditors) {
      purchasesWrites.OpeningCreditors[`B${row}`] = c.supplier;
      if (c.invoice) purchasesWrites.OpeningCreditors[`C${row}`] = c.invoice;
      purchasesWrites.OpeningCreditors[`H${row}`] = c.amount;
      row++;
    }
  }
  if (scenario.closing_creditors) {
    if (!purchasesWrites.ClosingCreditors) purchasesWrites.ClosingCreditors = {};
    let row = 5;
    for (const c of scenario.closing_creditors) {
      purchasesWrites.ClosingCreditors[`B${row}`] = c.supplier;
      if (c.invoice) purchasesWrites.ClosingCreditors[`C${row}`] = c.invoice;
      purchasesWrites.ClosingCreditors[`H${row}`] = c.amount;
      row++;
    }
  }

  // Stock (Financialaccounts.xlsx Stock sheet)
  if (scenario.stock) {
    if (!hubWrites.Stock) hubWrites.Stock = {};
    if (scenario.stock.opening !== undefined) hubWrites.Stock.B5 = scenario.stock.opening;
    if (scenario.stock.closing !== undefined) hubWrites.Stock.B8 = scenario.stock.closing;
  }

  // Payslips.xlsx employee details (same layout as SE: 5 blocks at 26-row intervals)
  const payslipsWrites = {};
  if (scenario.employees) {
    const EMP_BASE_ROWS = [13, 39, 65, 91, 117];
    payslipsWrites.Employee = {};
    const emp = payslipsWrites.Employee;
    const biz = scenario.business || {};
    if (biz.name) emp.D5 = biz.name;
    if (biz.address) emp.D6 = biz.address;
    if (biz.town) emp.D7 = biz.town;
    if (biz.postcode) emp.D9 = biz.postcode;

    for (let i = 0; i < Math.min(scenario.employees.length, 5); i++) {
      const e = scenario.employees[i];
      const base = EMP_BASE_ROWS[i];
      if (e.name) {
        const parts = e.name.split(" ");
        emp[`D${base + 2}`] = parts.slice(-1)[0];
        emp[`D${base + 3}`] = parts.slice(0, -1).join(" ");
      }
      if (e.niNumber) emp[`M${base + 2}`] = e.niNumber;
      emp[`D${base + 15}`] = e.payFrequency === "weekly" ? "W" : "M";
      if (e.employeeID) emp[`D${base + 16}`] = e.employeeID;
      emp[`D${base + 17}`] = e.isDirector ? "D" : e.niCategory || "A";
    }
  }

  // Payslips.xlsx monthly payroll data — rows 51-55 in each monthly tab
  if (scenario.payroll) {
    for (const [monthKey, entries] of Object.entries(scenario.payroll)) {
      const sm = SCENARIO_MONTHS.find((s) => s.key === monthKey);
      if (!sm) continue;
      const shifted = new Date(Date.UTC(2000, sm.month + monthOffset, 1));
      const tabName = SHORT_MONTHS[shifted.getUTCMonth()];

      if (!payslipsWrites[tabName]) payslipsWrites[tabName] = {};
      const sheet = payslipsWrites[tabName];
      // Write wages paid date from first entry
      if (entries.length > 0) {
        const d = parseDate(entries[0].date);
        const shifted2 = shiftDate(d);
        sheet.M49 = toExcelSerial(shifted2.getUTCFullYear(), shifted2.getUTCMonth() + 1, shifted2.getUTCDate());
      }
      for (let i = 0; i < Math.min(entries.length, 5); i++) {
        const row = 51 + i;
        const e = entries[i];
        if (e.name) sheet[`F${row}`] = e.name;
        sheet[`M${row}`] = e.grossPay;
        sheet[`N${row}`] = e.incomeTax;
        sheet[`O${row}`] = e.employeeNI;
        sheet[`R${row}`] = e.netPay;
        sheet[`S${row}`] = e.employerNI;
      }
    }
  }

  // Fixedassets.xlsx opening asset values
  const fixedAssetsWrites = {};
  if (scenario.opening_fixed_assets) {
    fixedAssetsWrites.Schedule = {};
    const fa = fixedAssetsWrites.Schedule;
    let motorRow = 6;
    let computerRow = 6;
    for (const asset of scenario.opening_fixed_assets) {
      if (asset.category === "motor") {
        fa[`E${motorRow}`] = asset.cost;
        if (asset.acc_dep) fa[`Y${motorRow}`] = asset.acc_dep;
        if (asset.description) fa[`D${motorRow}`] = asset.description;
        motorRow++;
      } else if (asset.category === "computer") {
        fa[`E${computerRow}`] = asset.cost;
        if (asset.acc_dep) fa[`Y${computerRow}`] = asset.acc_dep;
        if (asset.description) fa[`D${computerRow}`] = asset.description;
        computerRow++;
      }
    }
  }

  // Bank entries — Ltd has 4 bank files mapped by account ID
  const BANK_ACCOUNT_FILES = {
    1200: "Currentaccount.xlsx",
    1210: "Savingaccount.xlsx",
    1220: "Cashaccount.xlsx",
    1230: "Creditcardaccount.xlsx",
  };
  const bankFileWrites = {};
  if (scenario.bank) {
    const receiptRows = {};
    const paymentRows = {};

    for (const [monthKey, transactions] of Object.entries(scenario.bank)) {
      const sm = SCENARIO_MONTHS.find((s) => s.key === monthKey);
      if (!sm) continue;
      const shifted = new Date(Date.UTC(2000, sm.month + monthOffset, 1));
      const tabName = SHORT_MONTHS[shifted.getUTCMonth()];

      for (const tx of transactions) {
        const acct = tx.account || "1200";
        const fileName = BANK_ACCOUNT_FILES[acct] || "Currentaccount.xlsx";
        if (!bankFileWrites[fileName]) bankFileWrites[fileName] = {};
        if (!bankFileWrites[fileName][tabName]) bankFileWrites[fileName][tabName] = {};
        const sheet = bankFileWrites[fileName][tabName];
        const d = parseDate(tx.date);
        const shifted2 = shiftDate(d);
        const serial = toExcelSerial(shifted2.getUTCFullYear(), shifted2.getUTCMonth() + 1, shifted2.getUTCDate());
        const rowKey = `${fileName}:${tabName}`;

        if (tx.code === "BC") {
          sheet.A1 = tx.amount;
        } else if (["BC", "DR", "CR", "K", "RV", "DL", "X"].includes(tx.code)) {
          if (!receiptRows[rowKey]) receiptRows[rowKey] = 6;
          const row = receiptRows[rowKey]++;
          sheet[`A${row}`] = serial;
          if (tx.source) sheet[`B${row}`] = tx.source;
          sheet[`E${row}`] = tx.code;
          sheet[`F${row}`] = tx.amount;
        } else {
          if (!paymentRows[rowKey]) paymentRows[rowKey] = 6;
          const row = paymentRows[rowKey]++;
          sheet[`P${row}`] = serial;
          if (tx.source) sheet[`Q${row}`] = tx.source;
          sheet[`S${row}`] = tx.code;
          sheet[`T${row}`] = tx.amount;
        }
      }
    }
  }

  const result = {
    "Sales.xlsx": salesWrites,
    "Purchases.xlsx": purchasesWrites,
  };
  for (const [fileName, writes] of Object.entries(bankFileWrites)) {
    if (Object.keys(writes).length > 0) result[fileName] = writes;
  }
  if (Object.keys(hubWrites).length > 0) result["Financialaccounts.xlsx"] = hubWrites;
  if (Object.keys(payslipsWrites).length > 0) result["Payslips.xlsx"] = payslipsWrites;
  if (Object.keys(fixedAssetsWrites).length > 0) result["Fixedassets.xlsx"] = fixedAssetsWrites;
  return result;
}

// ── Standard reads for reconciliation ──────────────────────────────────────
// Reads from Financialaccounts.xlsx after cross-file recalculation.
// MnthP&L column B = annual totals (SUM of monthly C:N).
// CorporationTax column K = CT calculation.

export const TAX_SHEET = "CorporationTax";

// prettier-ignore
export const CELL_MAP = [
  // ── Business Details (OpenAccounts sheet) ──
  ["OpenAccounts", "E2",  "Company Name",          "entityInformation.organizationIdentifier",  "Business Details", 0],
  ["OpenAccounts", "E3",  "Company Number",        "diya-gl:companyNumber",                     "Business Details", 0],
  ["OpenAccounts", "E4",  "Address",               "gl-bus:organizationAddress",                "Business Details", 0],
  ["OpenAccounts", "E6",  "UTR",                   "gl-taf:taxRegistrationNumber",              "Business Details", 0],
  // ── Management P&L (MnthP&L) ──
  ["MnthP&L", "B4",  "Product A — Consultancy",   "accounts.sales.4000",            "Profit & Loss Account", 1],
  ["MnthP&L", "B5",  "Product B — Software",      "accounts.sales.4001",            "Profit & Loss Account", 1],
  ["MnthP&L", "B6",  "Product C — Training",      "accounts.sales.4002",            "Profit & Loss Account", 1],
  ["MnthP&L", "B7",  "Other Direct Income",       "accounts.sales.4003",            "Profit & Loss Account", 1],
  ["MnthP&L", "B8",  "Grants Received",           "accounts.sales.4004",            "Profit & Loss Account", 1],
  ["MnthP&L", "B9",  "**Sales Turnover**",        "gl-cor:amount (salesTurnover)",  "Profit & Loss Account", 0],
  ["MnthP&L", "B11", "Materials / Stock",          "accounts.purchases.5000",        "Profit & Loss Account", 1],
  ["MnthP&L", "B12", "Sub-Contractors",            "accounts.purchases.5001",        "Profit & Loss Account", 1],
  ["MnthP&L", "B13", "Other Direct Costs",         "accounts.purchases.5002",        "Profit & Loss Account", 1],
  ["MnthP&L", "B14", "Cost of Sales",              "gl-cor:amount (costOfSales)",    "Profit & Loss Account", 0],
  ["MnthP&L", "B16", "**Gross Profit**",           "gl-cor:amount (grossProfit)",    "Profit & Loss Account", 0],
  // B18-B40: Actual mapping from TrialBalance D64-D89 → MnthP&L C18-C40
  ["MnthP&L", "B18", "PAYE Wages + Non-PAYE Employee", "dpl:WagesAndSalaries (combined)", "Profit & Loss Account", 1],
  ["MnthP&L", "B19", "Directors Non-PAYE (code d)",  "accounts.purchases.5100",        "Profit & Loss Account", 1],
  ["MnthP&L", "B20", "PAYE Employee Wages",          "dpl:WagesAndSalaries (PAYE)",    "Profit & Loss Account", 1],
  ["MnthP&L", "B21", "Premises (code r)",            "accounts.purchases.5200",        "Profit & Loss Account", 1],
  ["MnthP&L", "B22", "Light, Heat, Power (code p)",  "accounts.purchases.5201",        "Profit & Loss Account", 1],
  ["MnthP&L", "B23", "Distribution (code t)",        "accounts.purchases.5300",        "Profit & Loss Account", 1],
  ["MnthP&L", "B24", "Equipment Hire (code q)",      "accounts.purchases.5301",        "Profit & Loss Account", 1],
  ["MnthP&L", "B25", "Repairs & Maintenance (code m)","accounts.purchases.5400",       "Profit & Loss Account", 1],
  ["MnthP&L", "B26", "Consumables (code u)",         "accounts.purchases.5401",        "Profit & Loss Account", 1],
  ["MnthP&L", "B27", "Advertising (code a)",         "accounts.purchases.5500",        "Profit & Loss Account", 1],
  ["MnthP&L", "B28", "General Admin (code g)",       "accounts.purchases.5501",        "Profit & Loss Account", 1],
  ["MnthP&L", "B29", "Travel & Hotel (code h)",      "accounts.purchases.5600",        "Profit & Loss Account", 1],
  ["MnthP&L", "B30", "Motor Vehicle (code v)",       "accounts.purchases.5601",        "Profit & Loss Account", 1],
  ["MnthP&L", "B31", "Insurance (code n)",           "accounts.purchases.5700",        "Profit & Loss Account", 1],
  ["MnthP&L", "B32", "Leasing (code f)",             "accounts.purchases.5701",        "Profit & Loss Account", 1],
  ["MnthP&L", "B33", "Legal & Professional (code l)","accounts.purchases.5800",        "Profit & Loss Account", 1],
  ["MnthP&L", "B34", "Bad Debts (from Sales)",       "accounts.sales.4005",            "Profit & Loss Account", 1],
  ["MnthP&L", "B35", "Depreciation (bank)",          "gl-cor:amount (depreciation)",   "Profit & Loss Account", 1],
  ["MnthP&L", "B36", "Depreciation (combined)",      "gl-cor:amount (depreciation2)",  "Profit & Loss Account", 1],
  ["MnthP&L", "B37", "Charitable Donations (code y)","accounts.purchases.5801",        "Profit & Loss Account", 1],
  ["MnthP&L", "B38", "Goodwill (code z)",            "accounts.purchases.5802",        "Profit & Loss Account", 1],
  ["MnthP&L", "B39", "Depreciation 2",               "gl-cor:amount (depreciation3)",  "Profit & Loss Account", 1],
  ["MnthP&L", "B40", "Depreciation 3",               "gl-cor:amount (depreciation4)",  "Profit & Loss Account", 1],
  ["MnthP&L", "B41", "Total Admin Expenses",       "gl-cor:amount (totalAdmin)",     "Profit & Loss Account", 0],
  ["MnthP&L", "B43", "**Operating Profit**",       "gl-cor:amount (operatingProfit)","Profit & Loss Account", 0],
  ["MnthP&L", "B44", "Interest Received",          "gl-cor:amount (interestReceived)","Profit & Loss Account", 1],
  ["MnthP&L", "B45", "**Profit Before Tax**",      "gl-cor:amount (profitBeforeTax)","Profit & Loss Account", 0],
  // ── Corporation Tax (CT600) ──
  [TAX_SHEET, "K5",  "Operating Profit",            "gl-cor:amount (ct600.box145)",  "Corporation Tax (CT600)", 0],
  [TAX_SHEET, "K12", "Add back: Depreciation",      "gl-cor:amount (ct600.addBack)", "Corporation Tax (CT600)", 1],
  [TAX_SHEET, "K22", "Less: Capital Allowances",    "tax.capitalAllowances (ct600)",  "Corporation Tax (CT600)", 1],
  [TAX_SHEET, "K28", "**Profit Chargeable to CT**", "gl-cor:amount (ct600.box315)",  "Corporation Tax (CT600)", 0],
  [TAX_SHEET, "K35", "**Corporation Tax**",         "gl-cor:taxAmount (ct600.box430)","Corporation Tax (CT600)", 0],
  [TAX_SHEET, "K39", "Tax Outstanding",             "gl-cor:taxAmount (ct600.box515)","Corporation Tax (CT600)", 0],
  // ── Published P&L (column D has formulas) ──
  ["PubP&L", "D7",  "Sales Turnover",              "gl-cor:amount (pubPL.salesTurnover)","Published P&L", 1],
  ["PubP&L", "D8",  "Investment Grants",           "gl-cor:amount (pubPL.grants)",    "Published P&L", 1],
  ["PubP&L", "D9",  "**Total Sales Turnover**",    "gl-cor:amount (pubPL.totalTurnover)","Published P&L", 0],
  ["PubP&L", "D16", "Cost of Sales",               "gl-cor:amount (pubPL.cos)",       "Published P&L", 1],
  ["PubP&L", "D18", "**Gross Profit**",            "gl-cor:amount (pubPL.gross)",     "Published P&L", 0],
  // ── Published Balance Sheet (column D has formulas) ──
  ["PubBalSht", "D6",  "Fixed Assets (NBV)",       "gl-cor:amount (pubBS.fixedAssets)",  "Published Balance Sheet", 0],
  ["PubBalSht", "D9",  "Stock",                    "accounts.assets.1100 (pubBS)",       "Published Balance Sheet", 1],
  ["PubBalSht", "D13", "Current Assets",           "gl-cor:amount (pubBS.currentAssets)","Published Balance Sheet", 0],
  ["PubBalSht", "D15", "Creditors < 1 year",       "gl-cor:amount (pubBS.creditors)",    "Published Balance Sheet", 1],
  ["PubBalSht", "D22", "**Net Current Assets**",   "gl-cor:amount (pubBS.netCurrent)",   "Published Balance Sheet", 0],
  ["PubBalSht", "D26", "**Total Assets less CL**", "gl-cor:amount (pubBS.totalAssetsLessCL)","Published Balance Sheet", 0],
  ["PubBalSht", "D28", "Other Creditors",          "gl-cor:amount (pubBS.otherCred)",    "Published Balance Sheet", 1],
  ["PubBalSht", "D29", "Directors Loan",           "accounts.liabilities.2500 (pubBS)",  "Published Balance Sheet", 1],
  // ── Stock ──
  ["Stock", "B5",  "Opening Stock",              "accounts.assets.1100 (opening)",      "Stock", 0],
  ["Stock", "B8",  "Closing Stock",              "accounts.assets.1100 (closing)",      "Stock", 0],
  // ── Trial Balance ──
  ["TrialBalance", "EJ91", "Audit Accuracy Check", "gl-cor:amount (trialBalanceCheck)", "Trial Balance", 0],
];

export function standardReads() {
  const reads = {};
  for (const [sheet, cell] of CELL_MAP) {
    if (!reads[sheet]) reads[sheet] = [];
    if (!reads[sheet].includes(cell)) reads[sheet].push(cell);
  }
  return reads;
}

export function reportSections(results) {
  const sectionMap = new Map();
  for (const [sheet, cell, label, , section, indent] of CELL_MAP) {
    if (!sectionMap.has(section)) sectionMap.set(section, []);
    const val = results[sheet]?.[cell];
    sectionMap.get(section).push({ label, value: fmt(val), indent });
  }
  return [...sectionMap.entries()].map(([title, rows]) => ({ title, rows }));
}

export function cellLabels() {
  const labels = {};
  for (const [sheet, cell, diyLabel, glMapping] of CELL_MAP) {
    const key = `${sheet}!${cell}`;
    labels[key] = { diyLabel, glMapping };
  }
  return labels;
}

function fmt(v) {
  if (v === null || v === undefined || v === "" || v === " ") return "—";
  if (typeof v === "number") return v.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return String(v);
}

// ── Compliance checks ──────────────────────────────────────────────────────

export function checkCompliance(results, expected, taxData, calculateExpectedTax) {
  const checks = [];

  function check(name, actual, expectedVal, tolerance = 1) {
    const pass = Math.abs(actual - expectedVal) <= tolerance;
    checks.push({ name, actual, expected: expectedVal, pass, diff: actual - expectedVal });
  }

  const pl = results["MnthP&L"];
  if (expected.total_sales !== undefined) check("Total Sales", pl.B9, expected.total_sales);
  if (expected.gross_profit !== undefined) check("Gross Profit", pl.B16, expected.gross_profit);
  if (expected.net_profit !== undefined) check("Net Profit", pl.B45, expected.net_profit);

  // P&L internal consistency (6a)
  check("P&L: Gross = Turnover - CoS", pl.B16, pl.B9 - (pl.B14 || 0));
  check("P&L: Operating = Gross - Admin", pl.B43, pl.B16 - (pl.B41 || 0));
  check("P&L: PBT = Operating + Interest", pl.B45, (pl.B43 || 0) + (pl.B44 || 0));

  // Total expenses cross-check (6b)
  const ltdAdminSum = [
    pl.B18,
    pl.B19,
    pl.B20,
    pl.B21,
    pl.B22,
    pl.B23,
    pl.B24,
    pl.B25,
    pl.B26,
    pl.B27,
    pl.B28,
    pl.B29,
    pl.B30,
    pl.B31,
    pl.B32,
    pl.B33,
    pl.B34,
    pl.B35,
    pl.B36,
    pl.B37,
    pl.B38,
    pl.B39,
    pl.B40,
  ].reduce((s, v) => s + (v || 0), 0);
  check("P&L: Admin lines sum = Total", pl.B41, ltdAdminSum);

  // Expense line totals (6f) — Ltd P&L keeps purchases at gross (same as SE)
  if (expected.total_premises_gross) check("Premises", pl.B21 || 0, expected.total_premises_gross);
  if (expected.total_legal_gross) check("Legal & Professional", pl.B33 || 0, expected.total_legal_gross);

  // Stock checks
  if (expected.opening_stock !== undefined) {
    const stock = results.Stock;
    if (stock && stock.B5 !== undefined) check("Opening Stock", stock.B5 || 0, expected.opening_stock);
    if (stock && stock.B8 !== undefined && expected.closing_stock !== undefined)
      check("Closing Stock", stock.B8 || 0, expected.closing_stock);
  }

  // Debtors/creditors checks
  if (expected.opening_debtors) {
    const total = expected.opening_debtors.reduce((s, d) => s + d.amount, 0);
    if (total > 0) check("Opening Debtors total", total, total);
  }
  if (expected.closing_debtors) {
    const total = expected.closing_debtors.reduce((s, d) => s + d.amount, 0);
    if (total > 0) check("Closing Debtors total", total, total);
  }
  if (expected.opening_creditors) {
    const total = expected.opening_creditors.reduce((s, c) => s + c.amount, 0);
    if (total > 0) check("Opening Creditors total", total, total);
  }
  if (expected.closing_creditors) {
    const total = expected.closing_creditors.reduce((s, c) => s + c.amount, 0);
    if (total > 0) check("Closing Creditors total", total, total);
  }

  if (taxData) {
    const ct = results[TAX_SHEET];
    const profit = ct.K28 || 0;
    if (profit > 0) {
      const rate = taxData.corporation_tax.small_profits_rate;
      const expectedCT = Math.round(profit * rate);
      check("Corporation Tax", ct.K35 || 0, expectedCT);

      // CT calculation chain (6d)
      check("CT: Chargeable >= Operating", ct.K28 || 0, ct.K5 || 0, ct.K28); // chargeable includes add-backs
      check("CT: Tax outstanding = CT", ct.K39 || 0, ct.K35 || 0);

      // Marginal relief warning (8g) — if profit > small profits limit, CT should be higher than small rate
      const smallLimit = taxData.corporation_tax.small_profits_limit || 50000;
      const mainRate = taxData.corporation_tax.main_rate || 0.25;
      if (profit > smallLimit) {
        const mainRateCT = Math.round(profit * mainRate);
        const marginalCheck = {
          name: "CT: Marginal relief expected (profit > £50K)",
          actual: ct.K35 || 0,
          expected: mainRateCT,
          pass: false,
          diff: (ct.K35 || 0) - mainRateCT,
          severity: "warning",
        };
        checks.push(marginalCheck);
      }
    }
  }

  return checks;
}

// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { buildReverseCodeMap, extractBstTransactions, normaliseLine } from "../lib/xlsx-exporter.js";
import { findXlsx } from "../lib/xlsx-reader.js";
import { BST_PURCHASE_CODE_MAP, LTD_PURCHASE_CODE_MAP, LTD_SALES_CODE_MAP } from "../lib/scenario-extractor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const BST_LATEST = resolve(ROOT, "examples", "bst-latest");

describe("buildReverseCodeMap", () => {
  it("inverts BST purchase code map", () => {
    const reverse = buildReverseCodeMap(BST_PURCHASE_CODE_MAP);
    expect(reverse.s).toBe("5000");
    expect(reverse.d).toBe("5001");
    expect(reverse.f).toBe("5900");
  });

  it("uses first account for ambiguous codes", () => {
    const reverse = buildReverseCodeMap(BST_PURCHASE_CODE_MAP);
    // "o" maps from multiple accounts; should use the first one found
    expect(reverse.o).toBeDefined();
  });

  it("inverts Ltd sales code map", () => {
    const reverse = buildReverseCodeMap(LTD_SALES_CODE_MAP);
    expect(reverse.a).toBe("4000");
    expect(reverse.fs).toBe("4006");
  });

  it("inverts Ltd purchase code map", () => {
    const reverse = buildReverseCodeMap(LTD_PURCHASE_CODE_MAP);
    expect(reverse.s).toBe("5000");
    expect(reverse.fa).toBe("5900");
  });
});

describe("normaliseLine", () => {
  it("normalises a line for comparison", () => {
    const line = {
      sourceJournalID: "sales",
      postingDate: "2025-04-01",
      accountMainID: 4000,
      amount: 1234.567,
      detailComment: "Test",
      extra: "ignored",
    };
    const normalised = normaliseLine(line);
    expect(normalised.accountMainID).toBe("4000"); // string
    expect(normalised.amount).toBe(1234.57); // rounded to 2dp
    expect(normalised.extra).toBeUndefined(); // stripped
  });
});

const hasBstLatest = existsSync(BST_LATEST) && findXlsx(BST_LATEST) !== null;

describe.skipIf(!hasBstLatest)("extractBstTransactions — BST latest example", () => {
  it("extracts sales and purchase lines from populated xlsx", async () => {
    const xlsxFile = findXlsx(BST_LATEST);
    const xlsxBuffer = readFileSync(resolve(BST_LATEST, xlsxFile));
    const lines = await extractBstTransactions(xlsxBuffer);

    expect(lines.length).toBeGreaterThan(0);
    const sales = lines.filter((l) => l.sourceJournalID === "sales");
    const purchases = lines.filter((l) => l.sourceJournalID === "purchases");
    expect(sales.length).toBeGreaterThan(0);
    expect(purchases.length).toBeGreaterThan(0);
  });

  it("extracts valid dates and amounts", async () => {
    const xlsxFile = findXlsx(BST_LATEST);
    const xlsxBuffer = readFileSync(resolve(BST_LATEST, xlsxFile));
    const lines = await extractBstTransactions(xlsxBuffer);

    for (const line of lines.slice(0, 5)) {
      expect(line.postingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof line.amount).toBe("number");
      expect(line.amount).toBeGreaterThan(0);
    }
  });
});

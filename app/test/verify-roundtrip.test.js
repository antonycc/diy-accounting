// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd
//
// Double-roundtrip fidelity test: diya-gl → Excel → export → Excel → export → compare.
// The first roundtrip normalises data to what each spreadsheet can store.
// The second roundtrip must produce identical output (lossless).
//
// Requires: LibreOffice installed (brew install --cask libreoffice)

import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { hasLibreOffice } from "../lib/spreadsheet-runner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const NODE = process.execPath;

function run(args) {
  return execFileSync(NODE, args, { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
}

function readLines(dir) {
  const content = readFileSync(resolve(dir, "lines.jsonl"), "utf8");
  return content
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

const PRODUCTS = [
  {
    name: "bst",
    data: "examples/precision-code-ltd/bst",
    years: "se-2025-2026",
    yearEnd: "2026-04-05",
  },
  {
    name: "se",
    data: "examples/precision-code-ltd/advanced",
    years: "se-2025-2026",
    yearEnd: "2026-04-05",
  },
  {
    name: "ltd",
    data: "examples/precision-code-ltd/full",
    years: "ltd-2025",
    yearEnd: "2026-03-31",
  },
];

describe.skipIf(!hasLibreOffice())("Double-roundtrip fidelity", () => {
  for (const product of PRODUCTS) {
    it(`${product.name}: pass 2 export equals pass 1 export`, { timeout: 300_000 }, () => {
      const pkg1 = resolve(ROOT, "target", `${product.name}-rt-pkg1`);
      const data1 = resolve(ROOT, "target", `${product.name}-rt-data1`);
      const pkg2 = resolve(ROOT, "target", `${product.name}-rt-pkg2`);
      const data2 = resolve(ROOT, "target", `${product.name}-rt-data2`);

      // Pass 1: original diya-gl → Excel → export
      run([
        "app/bin/generate.js",
        "--package",
        product.name,
        "--years",
        product.years,
        "--year-end",
        product.yearEnd,
        "--data",
        product.data,
        "--output-dir",
        pkg1,
        "--skip-guide",
      ]);
      run(["app/bin/export.js", "--package", product.name, "--source-dir", pkg1, "--output-dir", data1]);

      const lines1 = readLines(data1);
      expect(lines1.length).toBeGreaterThan(0);

      // Pass 2: exported diya-gl → Excel → export
      run([
        "app/bin/generate.js",
        "--package",
        product.name,
        "--years",
        product.years,
        "--year-end",
        product.yearEnd,
        "--data",
        data1,
        "--output-dir",
        pkg2,
        "--skip-guide",
      ]);
      run(["app/bin/export.js", "--package", product.name, "--source-dir", pkg2, "--output-dir", data2]);

      const lines2 = readLines(data2);

      // Compare line by line
      expect(lines2.length).toBe(lines1.length);
      for (let i = 0; i < lines1.length; i++) {
        expect(lines2[i], `Line ${i} mismatch`).toEqual(lines1[i]);
      }

      // Also compare book.toml
      const book1 = readFileSync(resolve(data1, "book.toml"), "utf8");
      const book2 = readFileSync(resolve(data2, "book.toml"), "utf8");
      expect(book2).toBe(book1);
    });
  }
});

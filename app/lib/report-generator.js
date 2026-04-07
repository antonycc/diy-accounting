// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd
//
// report-generator.js — Shared report formatting for reconciliation and standalone report commands.
// Extracted from app/bin/reconcile.js.

export function generateReport(packageName, scenarioName, results, checks, productMod) {
  const hasFail = checks.some((c) => !c.pass && c.severity !== "warning");
  const hasWarning = checks.some((c) => !c.pass && c.severity === "warning");
  const status = hasFail ? "ANOMALYDETECTED" : hasWarning ? "RECONCILES (with warnings)" : "RECONCILES";
  const lines = [
    `# Reconciliation Report: ${packageName}`,
    ``,
    `Scenario: ${scenarioName}`,
    `Status: ${status}`,
    ``,
    `## Compliance Checks`,
    ``,
    `| Check | Expected | Actual | Diff | Result |`,
    `|-------|----------|--------|------|--------|`,
  ];

  for (const c of checks) {
    const result = c.pass ? "PASS" : c.severity === "warning" ? "**WARNING**" : "**FAIL**";
    lines.push(`| ${c.name} | ${c.expected} | ${c.actual} | ${c.diff > 0 ? "+" : ""}${c.diff} | ${result} |`);
  }

  // Formatted accounting statements (if product module provides them)
  if (typeof productMod.reportSections === "function") {
    const sections = productMod.reportSections(results);
    for (const section of sections) {
      lines.push("");
      lines.push(`## ${section.title}`);
      lines.push("");
      lines.push("| | Amount |");
      lines.push("|---|------:|");
      for (const row of section.rows) {
        if (!row.label && !row.value) {
          lines.push("| | |");
        } else {
          const indent = row.indent ? "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(row.indent) : "";
          lines.push(`| ${indent}${row.label} | ${row.value} |`);
        }
      }
    }
  }

  // Cell-by-cell appendix with DIY labels and diya-gl mappings
  const labels = typeof productMod.cellLabels === "function" ? productMod.cellLabels() : {};

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Appendix: Cell Values");
  lines.push("");

  for (const [sheetName, cells] of Object.entries(results)) {
    if (!cells || typeof cells !== "object") continue;
    const entries = Object.entries(cells).filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== " ");
    if (entries.length === 0) continue;
    lines.push(`### ${sheetName}`);
    lines.push("");
    lines.push("| Cell | DIY Label | Value | diya-gl mapping |");
    lines.push("|------|-----------|-------|-----------------|");
    for (const [cell, val] of entries) {
      const key = `${sheetName}!${cell}`;
      const lbl = labels[key];
      const diyLabel = lbl?.diyLabel || "";
      const glMapping = lbl?.glMapping || "";
      lines.push(`| ${cell} | ${diyLabel} | ${val} | ${glMapping} |`);
    }
    lines.push("");
  }

  return { content: lines.join("\n"), compliant: !hasFail };
}

/**
 * Generate individual report files, one per reportSections() section.
 * Returns { "filename.md": content } map.
 */
export function generateSectionReports(results, productMod) {
  const reports = {};

  if (typeof productMod.reportSections !== "function") return reports;

  const sections = productMod.reportSections(results);
  for (const section of sections) {
    const lines = [];
    lines.push(`# ${section.title}`);
    lines.push("");
    lines.push("| | Amount |");
    lines.push("|---|------:|");
    for (const row of section.rows) {
      if (!row.label && !row.value) {
        lines.push("| | |");
      } else {
        const indent = row.indent ? "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(row.indent) : "";
        lines.push(`| ${indent}${row.label} | ${row.value} |`);
      }
    }
    lines.push("");

    const filename =
      section.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+$/, "") + ".md";
    reports[filename] = lines.join("\n");
  }

  // Cell appendix
  const labels = typeof productMod.cellLabels === "function" ? productMod.cellLabels() : {};
  const appendixLines = ["# Cell Values", ""];
  for (const [sheetName, cells] of Object.entries(results)) {
    if (!cells || typeof cells !== "object") continue;
    const entries = Object.entries(cells).filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== " ");
    if (entries.length === 0) continue;
    appendixLines.push(`## ${sheetName}`);
    appendixLines.push("");
    appendixLines.push("| Cell | DIY Label | Value | diya-gl mapping |");
    appendixLines.push("|------|-----------|-------|-----------------|");
    for (const [cell, val] of entries) {
      const key = `${sheetName}!${cell}`;
      const lbl = labels[key];
      const diyLabel = lbl?.diyLabel || "";
      const glMapping = lbl?.glMapping || "";
      const displayVal = typeof val === "number" ? parseFloat(val.toPrecision(15)) : val;
      appendixLines.push(`| ${cell} | ${diyLabel} | ${displayVal} | ${glMapping} |`);
    }
    appendixLines.push("");
  }
  reports["cell-values.md"] = appendixLines.join("\n");

  return reports;
}

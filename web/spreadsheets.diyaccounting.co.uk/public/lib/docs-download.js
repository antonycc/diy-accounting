/* SPDX-License-Identifier: AGPL-3.0-only */
/* Copyright (C) 2025-2026 DIY Accounting Ltd */

/**
 * docs-download.js — Populates the Documentation Downloads form on download.html.
 *
 * The document catalogue is hardcoded because the docs/ directory changes rarely.
 * Each entry maps a human-readable title to the available file formats.
 */
(function () {
  "use strict";

  var docs = [
    {
      title: "Basic Sole Trader - Getting Started",
      files: [
        { format: "PDF", filename: "Basic Sole Trader - Getting Started.pdf" },
        { format: "PDF (Excel 2010)", filename: "Basic Sole Trader - Getting Started (Excel 2010).pdf" },
      ],
    },
    {
      title: "Basic Sole Trader User Guide",
      files: [
        { format: "PDF", filename: "Basic Sole Trader User Guide.pdf" },
        { format: "DOCX", filename: "Basic Sole Trader User Guide.docx" },
      ],
    },
    {
      title: "Company Accounts User Guide",
      files: [
        { format: "PDF", filename: "Company Accounts User Guide.pdf" },
        { format: "DOCX", filename: "Company Accounts User Guide.docx" },
      ],
    },
    {
      title: "CT600 User Guide",
      files: [
        { format: "PDF", filename: "CT600 User Guide.pdf" },
        { format: "DOCX", filename: "CT600 User Guide.docx" },
      ],
    },
    {
      title: "Dividend Voucher",
      files: [{ format: "DOCX", filename: "Dividend Voucher.docx" }],
    },
    {
      title: "Double Entry Accounts Guide",
      files: [{ format: "DOCX", filename: "Double Entry Accounts Guide.docx" }],
    },
    {
      title: "Payslip User Guide",
      files: [
        { format: "PDF", filename: "Payslip User Guide.pdf" },
        { format: "DOCX", filename: "Payslip User Guide.docx" },
      ],
    },
    {
      title: "Self Employed User Guide",
      files: [
        { format: "PDF", filename: "Self Employed User Guide.pdf" },
        { format: "DOCX", filename: "Self Employed User Guide.docx" },
      ],
    },
    {
      title: "Taxi Driver User Guide",
      files: [
        { format: "PDF", filename: "Taxi Driver User Guide.pdf" },
        { format: "DOCX", filename: "Taxi Driver User Guide.docx" },
      ],
    },
  ];

  var titleSelect = document.getElementById("doc-title-select");
  var formatSelect = document.getElementById("doc-format-select");
  var downloadBtn = document.getElementById("doc-download-btn");

  if (!titleSelect || !formatSelect || !downloadBtn) {
    return;
  }

  /* Populate the title dropdown */
  titleSelect.innerHTML = "";
  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a document\u2026";
  titleSelect.appendChild(placeholder);

  docs.forEach(function (doc, index) {
    var opt = document.createElement("option");
    opt.value = index;
    opt.textContent = doc.title;
    titleSelect.appendChild(opt);
  });

  /* When the title changes, populate formats */
  titleSelect.addEventListener("change", function () {
    var idx = titleSelect.value;
    formatSelect.innerHTML = "";

    if (idx === "") {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Select a document first";
      formatSelect.appendChild(empty);
      downloadBtn.removeAttribute("href");
      downloadBtn.classList.add("disabled");
      return;
    }

    var selected = docs[parseInt(idx, 10)];
    selected.files.forEach(function (file, fi) {
      var opt = document.createElement("option");
      opt.value = fi;
      opt.textContent = file.format;
      formatSelect.appendChild(opt);
    });

    updateDownloadLink();
  });

  /* When the format changes, update the download link */
  formatSelect.addEventListener("change", updateDownloadLink);

  function updateDownloadLink() {
    var titleIdx = titleSelect.value;
    var formatIdx = formatSelect.value;

    if (titleIdx === "" || formatIdx === "") {
      downloadBtn.removeAttribute("href");
      downloadBtn.classList.add("disabled");
      return;
    }

    var file = docs[parseInt(titleIdx, 10)].files[parseInt(formatIdx, 10)];
    downloadBtn.href = "docs/" + encodeURIComponent(file.filename);
    downloadBtn.classList.remove("disabled");
  }

  /* Initial state */
  var initOpt = document.createElement("option");
  initOpt.value = "";
  initOpt.textContent = "Select a document first";
  formatSelect.appendChild(initOpt);
  downloadBtn.classList.add("disabled");
})();

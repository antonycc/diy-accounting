/* SPDX-License-Identifier: AGPL-3.0-only */
/* Copyright (C) 2025-2026 DIY Accounting Ltd */

// Renders references.html or sources.html from references.toml
(function () {
  const CATEGORY_LABELS = {
    "vat-registration": "VAT Registration",
    "vat-flat-rate": "VAT Flat Rate Scheme",
    "vat-penalties": "VAT Penalties",
    "vat-records": "VAT Record Keeping",
    "mtd-vat": "Making Tax Digital for VAT",
    "mtd-itsa": "Making Tax Digital for Income Tax",
    "capital-allowances": "Capital Allowances",
    "tax-rates": "Tax Rates",
    "payroll": "Payroll & PAYE",
    "company": "Company Accounts",
    "sole-trader": "Sole Trader",
    "bookkeeping": "Bookkeeping",
    "general": "General",
  };

  function categoryLabel(cat) {
    return CATEGORY_LABELS[cat] || cat;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function articleTitle(id) {
    return id.replace(/-/g, " ").replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  function loadReferences(callback) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "references.toml", true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        const data = TomlParser.parse(xhr.responseText);
        callback(data.reference || []);
      } else {
        callback([]);
      }
    };
    xhr.onerror = function () {
      callback([]);
    };
    xhr.send();
  }

  // References page: group by category, show each reference with sources
  function renderReferencesPage(refs) {
    const container = document.getElementById("references-list");
    if (!container) return;

    if (refs.length === 0) {
      container.innerHTML = "<p>No references found.</p>";
      return;
    }

    // Group by category
    const categories = {};
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      const cat = ref.category || "general";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(ref);
    }

    let html = "";
    const catKeys = Object.keys(categories).sort();
    for (let c = 0; c < catKeys.length; c++) {
      const catName = catKeys[c];
      const catRefs = categories[catName];
      html += '<div class="ref-category-section">';
      html += "<h2>" + escapeHtml(categoryLabel(catName)) + "</h2>";

      for (let r = 0; r < catRefs.length; r++) {
        const ref = catRefs[r];
        html += '<div class="ref-entry" id="' + escapeHtml(ref.id) + '">';
        html += "<h3>" + escapeHtml(ref.id) + "</h3>";
        html += '<p class="ref-claim">' + escapeHtml(ref.claim) + "</p>";

        // Articles using this reference
        if (ref.articles && ref.articles.length > 0) {
          html += '<p class="ref-articles">Used in: ';
          for (let a = 0; a < ref.articles.length; a++) {
            if (a > 0) html += ", ";
            html += '<a href="articles/' + escapeHtml(ref.articles[a]) + '.html">';
            html += escapeHtml(articleTitle(ref.articles[a]));
            html += "</a>";
          }
          html += "</p>";
        }

        // Sources
        const sources = ref.source || [];
        for (let s = 0; s < sources.length; s++) {
          const src = sources[s];
          html += '<div class="ref-source">';
          html += '<p class="ref-source-title">';
          html += '<a href="' + escapeHtml(src.url) + '" rel="noopener" target="_blank">';
          html += escapeHtml(src.title);
          html += "</a>";
          html += " &mdash; " + escapeHtml(src.publisher);
          if (src.authority) {
            html += ' <span class="ref-authority">(' + escapeHtml(src.authority) + ")</span>";
          }
          html += "</p>";
          if (src.extract) {
            html += '<blockquote class="ref-extract">&ldquo;' + escapeHtml(src.extract) + "&rdquo;</blockquote>";
          }
          html += '<p class="ref-accessed">Accessed: ' + escapeHtml(src.accessed) + "</p>";
          html += "</div>";
        }

        html += "</div>";
      }
      html += "</div>";
    }

    container.innerHTML = html;

    // Update count
    const countEl = document.getElementById("ref-count");
    if (countEl) {
      countEl.textContent = refs.length + " references across " + catKeys.length + " categories";
    }
  }

  // Sources page: build reverse index from source → references
  function renderSourcesPage(refs) {
    const container = document.getElementById("sources-list");
    if (!container) return;

    if (refs.length === 0) {
      container.innerHTML = "<p>No sources found.</p>";
      return;
    }

    // Build reverse index: source ID → { source info, citing references }
    const sourceMap = {};
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      const sources = ref.source || [];
      for (let s = 0; s < sources.length; s++) {
        const src = sources[s];
        if (!sourceMap[src.id]) {
          sourceMap[src.id] = {
            id: src.id,
            url: src.url,
            title: src.title,
            publisher: src.publisher,
            refs: [],
          };
        }
        sourceMap[src.id].refs.push({
          id: ref.id,
          claim: ref.claim,
        });
      }
    }

    // Group by publisher
    const publishers = {};
    const sourceIds = Object.keys(sourceMap);
    for (let j = 0; j < sourceIds.length; j++) {
      const source = sourceMap[sourceIds[j]];
      const pub = source.publisher || "Unknown";
      if (!publishers[pub]) publishers[pub] = [];
      publishers[pub].push(source);
    }

    let html = "";
    const pubKeys = Object.keys(publishers).sort();
    for (let p = 0; p < pubKeys.length; p++) {
      const pubName = pubKeys[p];
      const pubSources = publishers[pubName];

      html += '<div class="ref-category-section">';
      html += "<h2>" + escapeHtml(pubName) + "</h2>";

      for (let k = 0; k < pubSources.length; k++) {
        const src = pubSources[k];
        html += '<div class="source-entry" id="' + escapeHtml(src.id) + '">';
        html += "<h3>";
        html += '<a href="' + escapeHtml(src.url) + '" rel="noopener" target="_blank">';
        html += escapeHtml(src.title);
        html += "</a></h3>";
        html += '<p class="source-publisher">' + escapeHtml(src.publisher) + "</p>";

        html += '<ul class="source-refs">';
        for (let m = 0; m < src.refs.length; m++) {
          const citing = src.refs[m];
          html += "<li>";
          html += '<a href="references.html#' + escapeHtml(citing.id) + '">';
          html += escapeHtml(citing.id);
          html += "</a>: ";
          html += escapeHtml(citing.claim);
          html += "</li>";
        }
        html += "</ul></div>";
      }
      html += "</div>";
    }

    container.innerHTML = html;

    // Update count
    const countEl = document.getElementById("source-count");
    if (countEl) {
      countEl.textContent = sourceIds.length + " sources from " + pubKeys.length + " publishers";
    }
  }

  // Auto-init based on which page we're on
  loadReferences(function (refs) {
    if (document.getElementById("references-list")) {
      renderReferencesPage(refs);
    }
    if (document.getElementById("sources-list")) {
      renderSourcesPage(refs);
    }
  });
})();

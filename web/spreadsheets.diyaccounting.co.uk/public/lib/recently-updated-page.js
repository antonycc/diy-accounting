/* recently-updated-page.js — Renders the recently updated articles list */
(function () {
  "use strict";

  const container = document.getElementById("recently-updated-list");
  if (!container) return;

  // Load both TOML files: recently-updated for the list, knowledge-base for titles
  Promise.all([
    fetch("recently-updated.toml").then(function (r) {
      return r.text();
    }),
    fetch("knowledge-base.toml").then(function (r) {
      return r.text();
    }),
  ])
    .then(function (results) {
      const recentData = TomlParser.parse(results[0]);
      const kbData = TomlParser.parse(results[1]);

      // Build article title lookup from knowledge-base.toml
      const titleMap = {};
      const articles = kbData.article || [];
      articles.forEach(function (a) {
        if (a.id) titleMap[a.id] = a.title || a.id;
      });

      const entries = recentData.entry || [];
      if (entries.length === 0) {
        container.innerHTML = "<p>No recently updated articles.</p>";
        return;
      }

      // Sort by updated date descending (newest first)
      entries.sort(function (a, b) {
        return new Date(b.updated) - new Date(a.updated);
      });

      let html = "";
      entries.forEach(function (entry) {
        const slug = entry.article;
        const title = titleMap[slug] || slug.replace(/-/g, " ");
        const date = new Date(entry.updated);
        const dateStr = date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const timeStr = date.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });

        html += '<div class="kb-item recently-updated-item">';
        html += '<a href="articles/' + slug + '.html" class="kb-item-link">';
        html += '<span class="kb-item-title">' + title + "</span>";
        html += '<span class="recently-updated-date">' + dateStr + " at " + timeStr + "</span>";
        html += "</a>";
        html += "</div>";
      });

      container.innerHTML = html;
    })
    .catch(function (err) {
      console.error("Failed to load recently updated data:", err);
      container.innerHTML = "<p>Unable to load recently updated articles.</p>";
    });
})();

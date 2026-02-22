/* community-page.js — Fetches and renders GitHub Discussions */
(function () {
  "use strict";

  const container = document.getElementById("community-list");
  const categoryFilter = document.getElementById("category-filter");
  if (!container) return;

  const CACHE_KEY = "diy-community-discussions";
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const API_URL = "https://api.github.com/repos/antonycc/diy-accounting/discussions?per_page=30&sort=updated&direction=desc";
  let allDiscussions = [];

  function relativeDate(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffDay > 30) {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    if (diffDay >= 1) return diffDay + (diffDay === 1 ? " day ago" : " days ago");
    if (diffHr >= 1) return diffHr + (diffHr === 1 ? " hour ago" : " hours ago");
    if (diffMin >= 1) return diffMin + (diffMin === 1 ? " minute ago" : " minutes ago");
    return "just now";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function stripHtmlAndTruncate(text, maxLen) {
    if (!text) return "";
    // Strip markdown/HTML tags
    const stripped = text
      .replace(/<[^>]*>/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/[*_~`]/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\n+/g, " ")
      .trim();
    if (stripped.length > maxLen) {
      return stripped.substring(0, maxLen) + "\u2026";
    }
    return stripped;
  }

  function categoryEmoji(category) {
    if (!category || !category.emoji) return "";
    // GitHub category emojis are stored as shortcodes like ":speech_balloon:"
    // or as actual emoji characters
    const emoji = category.emoji;
    if (emoji.charAt(0) === ":") {
      // Shortcode — return a common mapping or skip
      const map = {
        ":speech_balloon:": "\uD83D\uDCAC",
        ":bulb:": "\uD83D\uDCA1",
        ":pray:": "\uD83D\uDE4F",
        ":raised_hands:": "\uD83D\uDE4C",
        ":mega:": "\uD83D\uDCE3",
        ":question:": "\u2753",
        ":thinking:": "\uD83E\uDD14",
        ":hammer_and_wrench:": "\uD83D\uDD28",
        ":star2:": "\uD83C\uDF1F",
        ":light_bulb:": "\uD83D\uDCA1",
        ":books:": "\uD83D\uDCDA",
      };
      return map[emoji] || "";
    }
    return emoji;
  }

  function renderDiscussions(discussions) {
    if (discussions.length === 0) {
      container.innerHTML = '<p class="no-results">No discussions found.</p>';
      return;
    }

    let html = "";
    discussions.forEach(function (d) {
      const cat = d.category;
      const catName = cat ? cat.name : "General";
      const emoji = categoryEmoji(cat);
      const snippet = stripHtmlAndTruncate(d.body, 150);
      const avatar = d.user && d.user.avatar_url ? d.user.avatar_url : "";
      const login = d.user ? d.user.login : "unknown";
      const comments = d.comments || 0;

      html += '<div class="kb-item community-item" data-category="' + escapeHtml(catName) + '">';
      html += '<a href="' + escapeHtml(d.html_url) + '" class="kb-item-link" target="_blank" rel="noopener noreferrer">';
      html += '<span class="community-category">' + emoji + " " + escapeHtml(catName) + "</span>";
      html += '<span class="kb-item-title">' + escapeHtml(d.title) + "</span>";
      if (snippet) {
        html += '<span class="community-snippet">' + escapeHtml(snippet) + "</span>";
      }
      html += '<span class="community-meta">';
      if (avatar) {
        html += '<img src="' + escapeHtml(avatar) + '&s=40" alt="" class="community-avatar" width="20" height="20" loading="lazy" />';
      }
      html += "<span>" + escapeHtml(login) + "</span>";
      html += "<span>Updated " + relativeDate(d.updated_at) + "</span>";
      html += "<span>" + comments + (comments === 1 ? " comment" : " comments") + "</span>";
      html += "</span>";
      html += "</a>";
      html += "</div>";
    });

    container.innerHTML = html;
  }

  function populateCategories(discussions) {
    const seen = {};
    const categories = [];
    discussions.forEach(function (d) {
      if (d.category && d.category.name && !seen[d.category.name]) {
        seen[d.category.name] = true;
        categories.push(d.category.name);
      }
    });
    categories.sort();
    categories.forEach(function (name) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      categoryFilter.appendChild(opt);
    });
  }

  function filterByCategory(category) {
    if (!category) {
      renderDiscussions(allDiscussions);
      return;
    }
    const filtered = allDiscussions.filter(function (d) {
      return d.category && d.category.name === category;
    });
    renderDiscussions(filtered);
  }

  function getCached() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (Date.now() - cached.timestamp > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return cached.data;
    } catch {
      return null;
    }
  }

  function setCache(data) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data: data,
        }),
      );
    } catch {
      // localStorage full or unavailable — ignore
    }
  }

  function showError() {
    container.innerHTML =
      '<p class="no-results">Unable to load discussions. ' +
      '<a href="https://github.com/antonycc/diy-accounting/discussions" target="_blank" rel="noopener noreferrer">' +
      "View discussions on GitHub</a></p>";
  }

  function handleData(discussions) {
    allDiscussions = discussions;
    populateCategories(discussions);
    renderDiscussions(discussions);
  }

  // Try cache first
  const cached = getCached();
  if (cached) {
    handleData(cached);
  } else {
    container.innerHTML = '<p class="no-results">Loading discussions\u2026</p>';
  }

  // Always fetch fresh data (update cache and re-render if changed)
  fetch(API_URL)
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (discussions) {
      setCache(discussions);
      handleData(discussions);
    })
    .catch(function (err) {
      console.error("Failed to load discussions:", err);
      if (!cached) showError();
    });

  if (categoryFilter) {
    categoryFilter.addEventListener("change", function () {
      filterByCategory(this.value);
    });
  }
})();

// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 DIY Accounting Ltd

/**
 * Knowledge Base Search Module
 *
 * Fuzzy matching using bigram similarity + keyword boost.
 * Shows top articles by priority when no search term.
 */

/**
 * Knowledge Base Search class for fuzzy matching article entries
 */
class KBSearch {
  /**
   * @param {Array} articles - Array of article objects
   * @param {Object} options - Search options
   * @param {number} options.defaultCount - Number of articles to show when no search (default: 10)
   * @param {number} options.maxResults - Maximum results to return (default: 20)
   * @param {number} options.minScore - Minimum score threshold (default: 0.15)
   */
  constructor(articles, options = {}) {
    this.articles = articles;
    this.defaultCount = options.defaultCount || 10;
    this.maxResults = options.maxResults || 20;
    this.minScore = options.minScore || 0.15;

    this.index = this.buildIndex(articles);
  }

  buildIndex(articles) {
    return articles.map((article) => ({
      ...article,
      questionBigrams: this.getBigrams(article.question.toLowerCase()),
      keywordSet: new Set((article.keywords || []).map((k) => k.toLowerCase())),
      allText: [article.question, article.description || "", ...(article.keywords || []), article.category].join(" ").toLowerCase(),
    }));
  }

  getBigrams(str) {
    const clean = str.replace(/[^a-z0-9\s]/g, "").trim();
    const bigrams = new Set();
    for (let i = 0; i < clean.length - 1; i++) {
      bigrams.add(clean.slice(i, i + 2));
    }
    return bigrams;
  }

  bigramSimilarity(set1, set2) {
    if (set1.size === 0 || set2.size === 0) return 0;
    let intersection = 0;
    for (const bigram of set1) {
      if (set2.has(bigram)) intersection++;
    }
    return (2 * intersection) / (set1.size + set2.size);
  }

  /**
   * Search articles with fuzzy matching
   * @param {string} query - Search query
   * @param {string} [categoryFilter] - Optional category to filter by
   * @returns {Array} Matching article entries sorted by relevance
   */
  search(query, categoryFilter) {
    const trimmed = query.trim().toLowerCase();

    // Apply category filter first if provided
    const pool = categoryFilter ? this.index.filter((a) => a.category === categoryFilter) : this.index;

    // No query = return top by priority
    if (!trimmed) {
      const source = categoryFilter ? pool : this.index;
      return source
        .slice()
        .sort((a, b) => a.priority - b.priority)
        .slice(0, this.defaultCount)
        .map((a) => this.articles.find((orig) => orig.id === a.id) || a);
    }

    const queryBigrams = this.getBigrams(trimmed);
    const queryWords = trimmed.split(/\s+/);

    const scored = pool.map((article) => {
      let score = this.bigramSimilarity(queryBigrams, article.questionBigrams);

      // Keyword exact match boost
      for (const word of queryWords) {
        if (article.keywordSet.has(word)) {
          score += 0.4;
        }
        for (const keyword of article.keywordSet) {
          if (keyword.includes(word) || word.includes(keyword)) {
            score += 0.15;
          }
        }
      }

      // Substring match in full text
      if (article.allText.includes(trimmed)) {
        score += 0.3;
      }

      // Small priority boost for high-priority items
      score += Math.max(0, (120 - article.priority) * 0.002);

      return { article, score };
    });

    return scored
      .filter((s) => s.score >= this.minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxResults)
      .map((s) => this.articles.find((orig) => orig.id === s.article.id) || s.article);
  }

  /**
   * Get all unique categories with counts
   * @returns {Array} Array of {category, count} sorted by count desc
   */
  getCategories() {
    const counts = {};
    for (const article of this.articles) {
      counts[article.category] = (counts[article.category] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }
}

/**
 * Debounce helper for search input
 */
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Export on window for browser use
if (typeof window !== "undefined") {
  window.KBSearch = KBSearch;
  window.debounce = debounce;
}

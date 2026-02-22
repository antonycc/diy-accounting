# Add Citation References to a Knowledge Base Article

Process a single article to add inline citation references backed by authoritative sources.

## Usage

```
/project:add-references articles/capital-allowances.html
/project:add-references                                   # picks a random unreferenced article
```

## Arguments

The user optionally provides an article filename (e.g., `capital-allowances.html` or `articles/capital-allowances.html`). If no article is specified, pick one at random from the unprocessed articles (see Step 0).

## Instructions

### Step 0: Select target article (when none specified)

If the user did not provide an article filename:

1. List all HTML files in `web/spreadsheets.diyaccounting.co.uk/public/articles/`
2. Search those files for `citation-check-date` to identify which have already been processed (both cited AND checked-but-no-claims)
3. From the articles that do NOT yet have the citation check date, pick one at random
4. Tell the user which article was selected before proceeding

### Step 1: Load the reference database

Read `web/spreadsheets.diyaccounting.co.uk/public/references.toml` to load all existing references. Note the highest reference ID number (e.g., if REF023 exists, next is REF024).

### Step 2: Read the target article

Read the article HTML file from `web/spreadsheets.diyaccounting.co.uk/public/articles/<filename>`. If the user provided a path without `articles/`, prepend it.

### Step 3: Identify verifiable claims

Scan the article body text for verifiable factual statements. Focus on:
- **Numerical thresholds**: pound amounts (£X), percentages, time periods
- **Legal requirements**: "must", "required", "compulsory", obligations
- **Deadlines**: filing dates, registration periods, retention periods
- **Rates and allowances**: tax rates, flat rate percentages, allowance amounts
- **Regulatory rules**: who qualifies, eligibility criteria, penalty structures

Skip opinions, advice, how-to instructions, and product descriptions.

### Step 4: Match or create references

For each verifiable claim found:

a. **Check for existing match**: Search references.toml for a reference with a similar `claim` or matching `category`. If the claim is essentially the same fact (even worded differently), REUSE the existing reference ID.

b. **If no match exists**: Create a new reference entry:
   - Assign next sequential ID (REF024, REF025, etc.)
   - Write a concise `claim` statement
   - Assign appropriate `category` from: vat-registration, vat-flat-rate, vat-penalties, vat-records, mtd-vat, mtd-itsa, capital-allowances, tax-rates, payroll, company, sole-trader, bookkeeping, general
   - **Fetch the authoritative source**: Use WebFetch to access the relevant GOV.UK/HMRC page and extract a verbatim quote supporting the claim
   - Record: source URL, page title, publisher, verbatim extract, today's date, authority level (primary/secondary/commentary)

c. **Add the article ID** to the reference's `articles` array if not already listed.

### Step 5: Add inline markup to article HTML

For each matched claim in the article text, wrap it with citation markup:

```html
<span class="ref" data-ref="REF001">the claim text<sup><a href="../references.html#REF001">[1]</a></sup></span>
```

The number in brackets [1], [2], etc. should be sequential within the article (first reference mentioned = [1], second = [2], etc.), regardless of the global REF ID.

### Step 6: Update JSON-LD structured data

Add a `"citation"` array to the article's existing JSON-LD script:

```json
"citation": [
  {
    "@type": "CreativeWork",
    "name": "Source page title",
    "url": "https://www.gov.uk/...",
    "publisher": {
      "@type": "GovernmentOrganization",
      "name": "HM Revenue & Customs"
    },
    "dateAccessed": "2026-02-05"
  }
]
```

### Step 7: Add citation check date

ALWAYS add a citation check date to the article, whether or not any references were added. Insert this line immediately before the closing `</article>` tag. Use today's date:

```html
        <p class="citation-check-date">Citations checked: <time datetime="2026-02-05">5 February 2026</time></p>
```

This marks the article as having been reviewed for citations, even if no verifiable claims were found.

### Step 8: Update references.toml

Append any new `[[reference]]` and `[[reference.source]]` entries to the end of references.toml. Update existing references' `articles` arrays if the current article was added.

### Step 8b: If no verifiable claims found

If the article is purely advice/opinion/how-to with no verifiable factual claims:
- Do NOT add any inline references
- Do NOT modify the JSON-LD
- Still ADD the citation check date (Step 7) — this marks the article as reviewed

### Step 9: Update recently-updated.toml

Read `web/spreadsheets.diyaccounting.co.uk/public/recently-updated.toml`. Add a new entry at the TOP of the file (after the header comment) for the article just processed:

```toml
[[entry]]
article = "the-article-slug"
updated = "2026-02-05T23:15:00Z"
```

Use the current UTC date and time for the `updated` field. If the article already has an entry, update its `updated` timestamp and move it to the top.

**Keep maximum 20 entries.** If there are more than 20 `[[entry]]` blocks after adding the new one, remove the oldest entries (at the bottom of the file) to bring it back to 20.

### Step 10: Report

Print a summary:
- Article processed: filename
- References added inline: count (or "0 — no verifiable claims")
- Existing references reused: list of IDs
- New references created: list of IDs with claims
- Sources fetched: list of URLs accessed
- Outdated claims found: list any claims where the article text doesn't match current GOV.UK figures

## Important Rules

- **Never fabricate sources**: Only cite pages you actually fetched via WebFetch
- **Verbatim extracts only**: Copy exact text from the source, do not paraphrase
- **Preserve article content**: Do not change the article's body text — only add `<span class="ref">` wrappers around existing text
- **Always add citation check date**: Even for articles with no verifiable claims
- **Always update recently-updated.toml**: Every processed article goes to the top of the list, max 20 entries
- **One article per run**: This skill processes exactly one article to keep changes reviewable
- **Commit after each article**: The user should commit changes after reviewing each article's references

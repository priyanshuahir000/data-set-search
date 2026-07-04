# Maison — home goods discovery

**Maison** is a small quick-commerce–style storefront for a catalog of about 4,000
home goods. You can browse by category, scroll curated product rails on the home
page, or search and get ranked results — and narrow things down with filters that
always show live counts. The search is still the point, so most of the work sits in
the backend: a normalized SQLite database with a full text index, ranked results,
synonym handling, typo correction, and natural-language intent parsing so a query
like "towel under 200" understands the price and prioritizes accordingly.

The stack is a React frontend and a Node API, kept in separate folders.

## What is in the box

```
maison/
  backend/     Node + Express + TypeScript API, SQLite (better-sqlite3) with FTS5
  frontend/    React + Vite + TypeScript UI 
  DECISIONS.md every meaningful choice and the reason for it
```

## Requirements

- Node 20, 22, or 24. The API uses `better-sqlite3`, a native module that installs
  a prebuilt binary, so no compiler is needed on any current Node line. If you are
  on an unusually old patch and npm tries to compile it from source, updating to the
  latest patch of your Node release pulls the prebuilt binary instead.
- npm 9 or newer

## Quick start

From the repository root:

```bash
# 1. install both workspaces
npm install

# 2. build the search database from the source catalog
#    (fetches items.json, normalizes it, and builds the SQLite index)
npm run ingest

# 3. run the API and the UI together
npm run dev
```

Then open the URL Vite prints, which is `http://localhost:5173`. The API runs on
`http://localhost:3001`, and the dev server proxies `/api` to it so everything is
one origin in the browser.

If you would rather run the two sides in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

To rebuild the database from a fresh download of the catalog:

```bash
npm run ingest -- --refresh
```

## How it works

There are three parts: the ingest step, the search API, and the UI.

### Ingest

`npm run ingest` fetches the catalog once, caches the raw file under
`backend/data/`, and rebuilds the database from scratch so a re-run is always
reproducible. During ingest each item is cleaned and enriched:

- Titles are trimmed, inner whitespace is collapsed, and casing is fixed. The raw
  data has values like `"  VINTAGE OAK BIN "` and `"brushed oak task lamp"`, and
  the search index should not care how a title happened to be typed.
- The catalog has no field for the thing people actually search for. A title like
  "Minimal Rattan Cutting Board" hides three useful attributes: a style (Minimal),
  a material (Rattan), and a product type (Cutting Board). The ingest step parses
  those out into their own columns using a small vocabulary read off the data, so
  "cutting board" and "rattan" become real, filterable attributes.
- Release dates that fall in the future are flagged so they can show as "coming
  soon" instead of quietly sorting to the top of "newest".

The result goes into a `products` table with ordinary indexes on the filterable
columns, plus an FTS5 virtual table that indexes the text people search.

### Search API

The API is a thin layer over SQLite. A request parses intent out of the query,
runs the full text match on the remaining words, applies the structured filters,
counts the facets, ranks the matches, floats the items that satisfy any soft
constraint to the top, and returns a page. The ranking, synonym handling, typo
correction, and intent parsing are described in detail in DECISIONS.md. The short
version: text relevance from BM25 decides most of the order, and product quality
(rating, review volume, availability) breaks ties and gives a gentle nudge, so a
strong keyword match always wins over a popular item that does not really match.

The response includes `appliedQuery` (the text after intent was removed),
`understood` (the constraints read from the query, which the UI shows as chips), and
`partition` (the split between the items that satisfy the query's soft constraints and
the rest), alongside the items, totals, and live facets.

Endpoints:

```
GET /api/search    q, categories, brands, materials, productTypes,
                   minPrice, maxPrice, minRating, inStockOnly, sort, page, pageSize
GET /api/suggest   q                       autocomplete for the search box
GET /api/facets    global facet values and price range
GET /api/products/:id
GET /api/health
```

`sort` is one of `relevance`, `price_asc`, `price_desc`, `rating`, `reviews`,
`newest`. Filters accept either repeated params or comma separated lists.

### UI

The frontend is a storefront with three views, all wired to the same API. A header
carries the search box and a category bar that morphs on scroll: a big icon strip at
the top of the home page that collapses into compact tabs as you scroll down.

**Home** opens on a couple of promo banners and then a series of product rails, one
per product type ("Table Lamps", "Vases", "Side Tables", …). The rails are revealed
lazily in small batches as you scroll, so the page stays light, with left/right
arrows to page through each rail on pointer devices. When every type has been shown,
an end-of-list illustration marks the bottom.

**Category** is a two-pane browse: a breadcrumb, a subcategory list with live counts
down the left (a horizontal pill scroller on mobile), and the products on the right.

**Search** is the workhorse. Autocomplete updates as you type (with trending searches
when the box is empty), but the results move only when you submit (Enter, the search
button, or a suggestion), which keeps the page calm. Requests are kept in order with
an abort controller and matched words are highlighted. A filter rail with live counts
sits on the left — category icons, material swatches, and brand monograms make the
facets scannable — with a sort control above the grid. The constraints read out of a
natural-language query ("vase under 300") surface as "reading your search as" chips,
soft-constraint matches float to the top of the results, and there are real empty and
error states, a "did you mean" / auto-correction path, and a "Show more" pager.

Every product card shows the image (with a category-tinted icon as a graceful
fallback), price, rating, material, and status badges (bestseller, coming soon, out
of stock, new). Adding to the cart turns the button into a quantity stepper, and a
sticky bar tracks the running subtotal. The cart is client-side and the strikethrough
"compare-at" price is derived per product — the real catalog has neither, so both are
isolated in the frontend and easy to remove.

The layout is responsive: on tablet and mobile the search drops to its own row, the
category rail becomes a pill scroller, and the filter rail is replaced by a Filters
button that opens a bottom sheet. View changes show brief shimmer skeletons, and
scrolling has a light smooth-scroll (Lenis) that backs off when the user prefers
reduced motion.

## Notes

- The database file and the cached catalog are not committed. Run `npm run ingest`
  to create them.
- `better-sqlite3` ships prebuilt binaries for common platforms. If your machine
  needs to compile it and the install fails, install your platform build tools and
  run `npm install` again.

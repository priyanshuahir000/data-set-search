# Decisions

The brief said the decisions around the search matter more than the search itself,
so this document is the real deliverable. It walks through what I found in the data,
the choices I made, and why I made them. Where I chose not to do something, I have
said so, because leaving things out was part of the work.

## What the data is actually like

Before writing any code I read the catalog. A few things stood out, and they drove
almost every decision that followed.

The titles are generated from a pattern: a style word, then a material, then a
product type. "Sculptural Terracotta Tumbler", "Minimal Rattan Cutting Board",
"Faceted Linen Pendant Light". Once you see the pattern you see it everywhere,
which tells you the vocabulary is small and regular.

The data is also dirty in the ways real catalogs are dirty. Some titles are padded
and shouting, like `"  VINTAGE OAK BIN "`. Some are all lowercase, like
`"brushed oak task lamp"`. If you index the raw strings, search quality depends on
how each row happened to be typed, which is not acceptable.

The titles produce combinations that do not exist in real life: "Leather Tea Towel",
"Marble Area Rug", "Wool Watering Can". That is a strong signal the data is
synthetic, and a reminder not to over-trust any single field or read too much
meaning into it.

The `tags` field looks helpful but is lossy. "Minimal Rattan Cutting Board" carries
tags `["kitchen", "minimal"]`, which drop both the material and the product type.
So tags are useful as one more text signal, but they cannot be the basis for
filtering.

The most important finding: the thing a shopper actually searches for, the product
type ("vase", "table lamp", "area rug"), is not a field at all. It only exists
inside the title string. `category` is much broader (Kitchen, Textiles, Lighting),
so it does not answer "show me cutting boards".

Finally, some `releasedAt` dates are in the future. A naive "newest" sort would put
unreleased products at the very top, which is misleading.

## The central decision: give the data the structure it is missing

Since product type, material, and style live only inside the title, I pull them out
at ingest time into their own columns. I do this with three small closed
vocabularies (materials, styles, product types) that I read directly off the data.
The parse is simple because the title format is strict: find the known material
token, find the known style token, and treat the trailing phrase as the product
type, matching multi word types like "planter box" before single word ones like
"planter". Anything the parser cannot classify falls back to a best effort value
so no product is ever dropped.

This one step is what makes the rest of the search good. It turns "cutting board"
and "rattan" from substrings buried in a title into first class attributes that can
be searched with the right weight, filtered on, and counted as facets. It is also
the honest reading of the brief: the interesting work here is understanding the
data well enough to give it the shape it should have had.

## Storage and search engine: SQLite with FTS5

I store the catalog in SQLite and search it with FTS5, SQLite's built in full text
index, using BM25 for relevance.

I considered three alternatives and rejected each for a specific reason.

Scanning the JSON in memory with `String.includes` or a JS scoring loop would have
been the fastest thing to write. I did not do it because it is not really search.
There is no principled relevance, substring matching produces false hits (a search
for "art" matching "cart"), and it does not give you facet counts or ranking for
free. It also sets a bad precedent for a system that is supposed to be production
grade.

A dedicated search server such as Elasticsearch or OpenSearch is where this would
go at real scale, and it is genuinely better once you need distributed indexes,
analyzers per language, and high write throughput. At 4,000 products, and even at a
few million, it is infrastructure and operational cost that buys nothing here. I
would reach for it when the catalog and the query load actually demand it, not
before.

Vector or semantic search was the interesting one to think about, because the
question in the brief hinted at it. I decided against it on purpose. Vector search
earns its keep when meaning matters more than words, for example long natural
language queries, or catalogs where the same idea is described in many different
ways. This catalog is the opposite: a tiny, regular vocabulary where the words are
the meaning. A keyword index with good ranking and a synonym layer gives better,
more predictable results here, with no embedding model, no vector store, and no
extra latency. Adding vectors now would be complexity for its own sake. I have
noted in "What I would do next" exactly where I would introduce a hybrid approach,
so the path is clear when the data changes.

FTS5 gives real relevance (BM25), tokenization and stemming, fast prefix queries
for search as you type, and it lives inside a single file with zero services to
run. For this problem that is the right amount of machine.

Normalization detail worth calling out: I clean titles for both display and
indexing (trim, collapse whitespace, fix casing), but I keep the original string as
`title_raw` so nothing is lost. The FTS index uses the Porter stemmer so singular
and plural forms match ("towel" finds "towels", "hanging" finds "hang").

## Ranking: text first, quality as the tie breaker

Relevance ordering blends two things.

The first is text relevance from BM25, with per column weights. Title and the
derived product type carry the most weight, then brand and material, then category
and tags, and description last because it is templated boilerplate that mostly
repeats the title. The weights live in one constant in the engine so they are easy
to tune.

The second is a product quality score built from rating, review volume (log scaled
so a product with 1,800 reviews does not bury a great product with 200), and
whether it is in stock.

For a keyword search the final order is roughly seventy percent text relevance and
thirty percent quality, plus a small bump when the title contains the exact query
string, and a small penalty for products that are not released yet. The ratio is
deliberate. Text has to dominate, because a beautiful, popular product that does
not match the words is still the wrong answer. Quality only decides things when the
text signal is close, which is exactly when you want the better reviewed, in stock
option to come first.

When there is no query at all, "relevance" has no meaning, so browsing falls back to
the quality score. That surfaces the strongest, most trusted, in stock products
first, which is a good default storefront.

The other sorts (price, rating, reviews, newest) are exact and predictable. Newest
sorts by release date and lets the future dated items appear, clearly badged as
coming soon, rather than hiding or silently promoting them.

## Synonyms: bridging shopper language to a synthetic vocabulary

Because the catalog vocabulary is narrow and a little artificial, real shopper words
often do not appear in it at all. People search "sofa", the data says "lounge
chair". People search "rug", the data says "area rug". People search "wooden", the
data says "oak" or "walnut". Without help, those searches return nothing, which
would feel broken.

So each query term expands into the catalog terms it should also match, using a
hand curated map. "lamp" reaches table lamps, floor lamps, pendant lights, sconces
and lanterns. "wooden" reaches the wood like materials. Multi word targets such as
"area rug" are matched as exact phrases. Terms are combined so that every concept in
the query must be present, which keeps "oak lamp" precise.

I chose a curated map rather than an automatic thesaurus on purpose. It is small,
it is reviewable, and it is the one place a merchandiser can teach the search new
language. That is a feature for a real team, not a limitation.

## Reading intent from the query

Real shoppers do not just type nouns. They type "towel under 200", "cheap oak
lamp", "vase 4 stars and up in stock", "coffee table between 100 and 300". So the
query itself is parsed for intent before it is searched. The parser handles price
(under, below, over, above, between, around, up to), a rating threshold ("4+
stars"), availability ("in stock"), and soft sort hints ("cheap", "premium", "top
rated", "newest"). The understood phrases are stripped out, so "towel under 200"
searches for "towel", and the constraint is applied separately.

The important decision is how the constraint is applied. It is soft, not a hard
filter. A price typed in the search box does not delete the towel that costs 210.
Instead the results are ranked on the remaining words, and then the items that
satisfy the constraint are floated to the top, with everything else kept in rank
order below a labeled divider that reads, for example, "more results, not under
$200". That is almost always what a person means: strongly prefer under 200, but
still let me see the one just over the line. When someone genuinely wants to
exclude, the sidebar filters are still there as hard filters. The sort hints only
take effect when the user has not picked an explicit sort of their own, so they
never fight a deliberate choice.

Two things make this safe to ship. It is transparent: the app shows small "reading
your search as" chips so the person can see exactly what was understood and ignore
it if it is wrong. And it degrades cleanly: anything the parser does not recognize
simply stays part of the text query.

## Typo tolerance: correct only when it helps

FTS5 does not do fuzzy matching, and running fuzzy matching on every query is both
slow and a good way to return noise. So typo correction is a fallback. If a query
returns nothing, and only then, I try to repair it. During ingest I build a lexicon
of every term in the index. For an unknown query term that is not already a live
prefix, I find the closest lexicon term by Damerau-Levenshtein distance (which
handles transpositions like "waht"), weighted toward more common terms, and search
again with the correction. The UI then shows "showing results for X", the same
pattern people already expect from search boxes.

## Filters: reliable, and counted the way faceted search should be

The brief asked whether extra filters are reliable to offer alongside the search.
They are, as long as they are built on fields you trust. So the filters are
category, the derived product type, material, brand, a price range, a minimum
rating, and an in stock toggle. Everything filterable is either a clean source
field or a value I derived deliberately, never the lossy tags.

Facet counts are computed live against the current result set, and each facet is
counted as if its own selection were not applied. That is what lets you select two
materials and still see the counts for the other materials, which is how good
faceted search behaves and what stops users from hitting dead ends.

## The tradeoff I am watching

The thing that makes this version feel good is also its main risk: I taught the
search about this specific catalog. The derived vocabularies and the synonym map are
tuned to a small, regular, synthetic dataset. On a real catalog that is messier and
far more varied, that hand tuning would not keep up, and maintaining it by hand
would not scale. The moment the data stops being this regular, or queries start
looking like real sentences, keyword plus synonyms stops being enough and the right
move is hybrid search: keep BM25 for exact and attribute queries, add vector search
for semantic intent, and blend the two. I did not build that now because this data
does not need it and it would have been the wrong use of the hour. But it is the
line I would watch, and crossing it is a data driven decision, not a preference.

## What I would do next

In rough order of value: measure real queries and let click through data, not my
guesses, drive the ranking weights, the synonym map, and the intent patterns. The
intent parser is deliberately rule based right now because that is legible and easy
to correct, but the phrases people actually use should be learned from logs rather
than guessed. Add hybrid vector search once queries get more natural or the catalog
gets more varied. Move facet counting into SQL aggregation if a result set ever gets
large enough that counting in the API process matters. Add query result caching for
popular searches. And add a small evaluation set of query and expected result pairs
so ranking changes can be checked instead of eyeballed.

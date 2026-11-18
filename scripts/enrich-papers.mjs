// Fetch abstracts and full author lists for entries in src/content/papers.bib and
// cache them in src/content/papers-meta.json (committed, so builds stay offline).
//
//   node scripts/enrich-papers.mjs            # fill in anything missing
//   node scripts/enrich-papers.mjs --force    # refetch everything
//
// Sources, in order: Crossref (by DOI), arXiv (by arXiv id), then OpenAlex and
// Semantic Scholar as abstract fallbacks (both rate-limited without an API key,
// so a run may leave gaps; rerun later to fill them). An `abstract = {...}` field
// in the .bib always wins over fetched text, so hand-edits never get clobbered.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const BIB = "src/content/papers.bib";
const OUT = "src/content/papers-meta.json";
const force = process.argv.includes("--force");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function bibEntries() {
  const src = readFileSync(BIB, "utf-8").replace(/^%.*$/gm, "");
  const out = [];
  for (const m of src.matchAll(/@\w+\{([^,\s]+),([\s\S]*?)\n\}/g)) {
    const field = (name) => m[2].match(new RegExp(`\\b${name}\\s*=\\s*\\{([^}]*)\\}`, "i"))?.[1].trim();
    const author = field("author") ?? "";
    out.push({
      key: m[1],
      doi: field("doi"),
      arxiv: field("arxiv")?.replace(/^arxiv:/i, ""),
      title: field("title") ?? "",
      firstFamily: author.split(/\s+and\s+/)[0]?.split(",")[0]?.replace(/[{}\\'"`^~]/g, "").trim() ?? "",
    });
  }
  return out;
}

const norm = (s) => s.normalize("NFD").replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
const cleanText = (s) =>
  s
    .replace(/<jats:title>[^<]*<\/jats:title>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .replace(/^(abstract|summary)[:.\s]+/i, "")
    .trim();

async function getJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function crossref(doi) {
  const { message: m } = await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  return {
    title: m.title?.[0] ?? "",
    abstract: m.abstract ? cleanText(m.abstract) : undefined,
    authors: (m.author ?? [])
      .filter((a) => a.family || a.name)
      .map((a) => ({
        given: a.given ?? "",
        family: a.family ?? a.name,
        ...(a.ORCID ? { orcid: a.ORCID.replace(/^http:/, "https:") } : {}),
      })),
  };
}

async function arxivBatch(ids) {
  if (!ids.length) return {};
  const url = `https://export.arxiv.org/api/query?id_list=${ids.join(",")}&max_results=${ids.length}`;
  const xml = await (await fetch(url)).text();
  const out = {};
  for (const entry of xml.split("<entry>").slice(1)) {
    const id = entry.match(/<id>https?:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/)?.[1] ?? "";
    const match = ids.find((q) => id === q || id.replace(/v\d+$/, "") === q.replace(/v\d+$/, ""));
    if (!match) continue;
    out[match] = {
      title: cleanText(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
      abstract: cleanText(entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? ""),
      authors: [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map(([, n]) => {
        const parts = n.trim().split(/\s+/);
        return { given: parts.slice(0, -1).join(" "), family: parts.at(-1) };
      }),
    };
  }
  return out;
}

async function openalexAbstracts(dois) {
  if (!dois.length) return {};
  const out = {};
  for (let i = 0; i < dois.length; i += 40) {
    const chunk = dois.slice(i, i + 40);
    const data = await getJson(
      `https://api.openalex.org/works?per_page=50&select=doi,abstract_inverted_index&filter=doi:${chunk.join("|")}`,
    );
    for (const w of data.results ?? []) {
      const inv = w.abstract_inverted_index;
      if (!inv) continue;
      const words = [];
      for (const [word, positions] of Object.entries(inv)) for (const p of positions) words[p] = word;
      out[w.doi.replace("https://doi.org/", "").toLowerCase()] = cleanText(words.join(" "));
    }
  }
  return out;
}

async function europePmcAbstract(doi) {
  const q = encodeURIComponent(`DOI:"${doi}"`);
  const data = await getJson(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${q}&resultType=core&format=json&pageSize=1`,
  );
  const text = data.resultList?.result?.[0]?.abstractText;
  return text ? cleanText(text) : undefined;
}

async function semanticScholarAbstracts(ids) {
  if (!ids.length) return {};
  const data = await getJson("https://api.semanticscholar.org/graph/v1/paper/batch?fields=abstract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const out = {};
  data.forEach((p, i) => p?.abstract && (out[ids[i]] = cleanText(p.abstract)));
  return out;
}

async function main() {
  const meta = existsSync(OUT) && !force ? JSON.parse(readFileSync(OUT, "utf-8")) : {};
  const entries = bibEntries();
  const warn = (key, msg) => console.warn(`  ! ${key}: ${msg}`);

  // Accept fetched data only when the title (or failing that, first author)
  // agrees with the .bib, so a wrong identifier can't attach someone else's paper.
  const accept = (e, got) => {
    const a = norm(e.title), b = norm(got.title ?? "");
    const titleOk = a && b && (a.includes(b.slice(0, 40)) || b.includes(a.slice(0, 40)));
    const authorOk = norm(got.authors?.[0]?.family ?? "") === norm(e.firstFamily);
    if (!titleOk && !authorOk) warn(e.key, `metadata mismatch ("${got.title?.slice(0, 60)}"), skipped`);
    return titleOk || authorOk;
  };
  const merge = (key, got, source) => {
    const m = (meta[key] ??= {});
    if (got.abstract && !m.abstract) Object.assign(m, { abstract: got.abstract, abstractSource: source });
    if (got.authors?.length && !m.authors) Object.assign(m, { authors: got.authors, authorsSource: source });
  };

  for (const e of entries.filter((e) => e.doi && (!meta[e.key]?.authors || !meta[e.key]?.abstract))) {
    try {
      const got = await crossref(e.doi);
      if (accept(e, got)) merge(e.key, got, "crossref");
    } catch (err) {
      warn(e.key, `crossref ${err.message}`);
    }
    await sleep(150);
  }

  const needArxiv = entries.filter((e) => e.arxiv && (!meta[e.key]?.authors || !meta[e.key]?.abstract));
  try {
    const got = await arxivBatch(needArxiv.map((e) => e.arxiv));
    for (const e of needArxiv) if (got[e.arxiv] && accept(e, got[e.arxiv])) merge(e.key, got[e.arxiv], "arxiv");
  } catch (err) {
    console.warn(`  ! arxiv batch failed: ${err.message}`);
  }

  const missing = () => entries.filter((e) => e.doi && !meta[e.key]?.abstract);
  for (const e of missing()) {
    try {
      const abstract = await europePmcAbstract(e.doi);
      if (abstract) merge(e.key, { abstract }, "europepmc");
    } catch (err) {
      warn(e.key, `europepmc ${err.message}`);
    }
    await sleep(150);
  }
  try {
    const got = await openalexAbstracts(missing().map((e) => e.doi.toLowerCase()));
    for (const e of missing()) if (got[e.doi.toLowerCase()]) merge(e.key, { abstract: got[e.doi.toLowerCase()] }, "openalex");
  } catch (err) {
    console.warn(`  ! openalex skipped: ${err.message}`);
  }
  try {
    const todo = missing();
    const got = await semanticScholarAbstracts(todo.map((e) => `DOI:${e.doi}`));
    for (const e of todo) if (got[`DOI:${e.doi}`]) merge(e.key, { abstract: got[`DOI:${e.doi}`] }, "semanticscholar");
  } catch (err) {
    console.warn(`  ! semantic scholar skipped: ${err.message}`);
  }

  const sorted = Object.fromEntries(Object.keys(meta).sort().map((k) => [k, meta[k]]));
  writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
  const noAbs = entries.filter((e) => !meta[e.key]?.abstract).map((e) => e.key);
  console.log(`${entries.length} entries; ${entries.length - noAbs.length} with abstracts.`);
  if (noAbs.length) console.log(`No abstract yet: ${noAbs.join(", ")}`);
}

main();

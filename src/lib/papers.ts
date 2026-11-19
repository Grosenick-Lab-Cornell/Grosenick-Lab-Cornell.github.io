import { readFileSync } from "node:fs";
import path from "node:path";
import peopleData from "@/content/people.yaml";
// Abstracts + full author lists fetched by scripts/enrich-papers.mjs.
import paperMeta from "@/content/papers-meta.json";
import paperSummaries from "@/content/paper-summaries.yaml";

export type Author = { name: string; bold: boolean; orcid?: string };
export type Chip = { label: string; href: string };
export type Paper = {
  key: string;
  type: string;
  authors: Author[];
  year: number;
  title: string;
  venue: string;
  selected: boolean;
  award?: string;
  chips: Chip[];
  abstract?: string;
  /** Plain-language summary from paper-summaries.yaml. */
  summary?: string;
  doi?: string;
  arxiv?: string;
  pdf?: string;
  /** Best outbound link to the paper itself (publisher, proceedings, or preprint). */
  primaryUrl?: string;
};

type MetaAuthor = { given: string; family: string; orcid?: string };
const META = paperMeta as Record<string, { abstract?: string; authors?: MetaAuthor[] }>;
const MAX_ABSTRACT = 2000;

// Fetched abstracts carry inline citation numbers ("risk factors for disease
// onset1.") and, for a few letters, the full text; tidy both.
function tidyAbstract(s: string): string {
  let t = s.replace(/([a-z]{2,})\d{1,2}(?:[,–-]\d{1,2})*(?=[.,;]\s|\.$)/g, "$1").trim();
  if (t.length > MAX_ABSTRACT) {
    const cut = t.lastIndexOf(". ", MAX_ABSTRACT);
    t = t.slice(0, cut > 0 ? cut + 1 : MAX_ABSTRACT) + " …";
  }
  return t;
}

const LATEX_ACCENTS: Record<string, string> = {
  "'": "́",
  "`": "̀",
  "^": "̂",
  '"': "̈",
  "~": "̃",
  "=": "̄",
  ".": "̇",
};

function decodeLatex(s: string): string {
  return s
    .replace(/\\([`'^"~=.])\{?([a-zA-Z])\}?/g, (_m, acc: string, c: string) =>
      c + (LATEX_ACCENTS[acc] ?? "")
    )
    .replace(/--/g, "–")
    .replace(/[{}]/g, "")
    .trim()
    .normalize("NFC");
}

// Keys of the form "lastname|firstinitial" so we only bold the actual lab
// member, not any author who happens to share a surname (e.g. "V. Buch"
// should not match Amanda M. Buch).
function labAuthorKeys(): Set<string> {
  const set = new Set<string>();
  const people = peopleData as Array<{ name: string; boldInPubs?: boolean }>;
  for (const p of people) {
    if (p.boldInPubs === false) continue; // e.g. alumni now running their own lab
    const cleaned = p.name
      .replace(/,.*$/, "") // drop ", PhD" / ", MS" / etc.
      .replace(/"[^"]*"/g, " ") // drop "nickname"
      .trim();
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) continue;
    const initial = tokens[0].charAt(0).toLowerCase();
    // "~" keys hold the first three letters of the given name, used when an
    // author list spells names out ("Miao He" is not Michelle He; "Ellen Rose
    // Bowen" on arXiv is Ellie Rose Bowen).
    const prefix = `~${tokens[0].slice(0, 3).toLowerCase()}`;
    const surnames = [tokens[tokens.length - 1]];
    if (tokens.length >= 3) surnames.push(tokens.slice(-2).join(" "));
    for (const s of surnames) {
      set.add(`${s.toLowerCase()}|${initial}`);
      set.add(`${s.toLowerCase()}|${prefix}`);
    }
  }
  return set;
}

function parseEntries(
  source: string
): Array<{ key: string; type: string; fields: Record<string, string> }> {
  const cleaned = source.replace(/^%.*$/gm, "");
  const entries: Array<{ key: string; type: string; fields: Record<string, string> }> = [];
  let i = 0;

  while (i < cleaned.length) {
    while (i < cleaned.length && cleaned[i] !== "@") i++;
    if (i >= cleaned.length) break;
    i++;

    let j = i;
    while (j < cleaned.length && /[a-zA-Z]/.test(cleaned[j])) j++;
    const type = cleaned.slice(i, j).toLowerCase();
    i = j;

    while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
    if (cleaned[i] !== "{") continue;
    i++;

    let depth = 1;
    const bodyStart = i;
    while (i < cleaned.length && depth > 0) {
      if (cleaned[i] === "{") depth++;
      else if (cleaned[i] === "}") depth--;
      if (depth > 0) i++;
    }
    const body = cleaned.slice(bodyStart, i);
    i++;

    const firstComma = body.indexOf(",");
    if (firstComma < 0) continue;
    const key = body.slice(0, firstComma).trim();
    const rest = body.slice(firstComma + 1);

    const fields: Record<string, string> = {};
    let k = 0;
    while (k < rest.length) {
      while (k < rest.length && /[\s,]/.test(rest[k])) k++;
      if (k >= rest.length) break;
      const nameStart = k;
      while (k < rest.length && /[a-zA-Z]/.test(rest[k])) k++;
      const name = rest.slice(nameStart, k).toLowerCase();
      if (!name) break;
      while (k < rest.length && /[\s=]/.test(rest[k])) k++;

      let value = "";
      if (rest[k] === "{") {
        let bd = 1;
        k++;
        const vs = k;
        while (k < rest.length && bd > 0) {
          if (rest[k] === "{") bd++;
          else if (rest[k] === "}") bd--;
          if (bd > 0) k++;
        }
        value = rest.slice(vs, k);
        k++;
      } else if (rest[k] === '"') {
        k++;
        const vs = k;
        while (k < rest.length && rest[k] !== '"') k++;
        value = rest.slice(vs, k);
        k++;
      } else {
        const vs = k;
        while (k < rest.length && !/[,\s]/.test(rest[k])) k++;
        value = rest.slice(vs, k);
      }
      fields[name] = value.trim();
    }
    entries.push({ key, type, fields });
  }
  return entries;
}

function splitAuthors(
  raw: string
): Array<{ first: string; last: string; isOthers: boolean }> {
  return raw.split(/\s+and\s+/).map((p) => {
    const trimmed = p.trim();
    if (trimmed.toLowerCase() === "others")
      return { first: "", last: "", isOthers: true };
    const comma = trimmed.indexOf(",");
    if (comma >= 0) {
      return {
        last: decodeLatex(trimmed.slice(0, comma)),
        first: decodeLatex(trimmed.slice(comma + 1)),
        isOthers: false,
      };
    }
    const tokens = decodeLatex(trimmed).split(/\s+/);
    return {
      first: tokens.slice(0, -1).join(" "),
      last: tokens[tokens.length - 1] ?? "",
      isOthers: false,
    };
  });
}

function formatAuthor(p: { first: string; last: string }): string {
  const initials = p.first
    .replace(/\./g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.charAt(0).toUpperCase() + ".")
    .join(" ");
  return [initials, p.last].filter(Boolean).join(" ");
}

function buildChips(fields: Record<string, string>): Chip[] {
  const chips: Chip[] = [];
  if (fields.url) chips.push({ label: "Paper", href: fields.url });
  else if (fields.doi)
    chips.push({ label: "Paper", href: `https://doi.org/${fields.doi}` });
  if (fields.arxiv) {
    const id = fields.arxiv.replace(/^arxiv:/i, "");
    chips.push({ label: "arXiv", href: `https://arxiv.org/abs/${id}` });
  }
  if (fields.biorxiv) chips.push({ label: "bioRxiv", href: fields.biorxiv });
  if (fields.medrxiv) chips.push({ label: "medRxiv", href: fields.medrxiv });
  if (fields.code) chips.push({ label: "Code", href: fields.code });
  if (fields.pdf) chips.push({ label: "PDF", href: fields.pdf });
  if (fields.slides) chips.push({ label: "Slides", href: fields.slides });
  return chips;
}

function loadAll(): Paper[] {
  const bibPath = path.resolve(process.cwd(), "src/content/papers.bib");
  const source = readFileSync(bibPath, "utf-8");
  const lab = labAuthorKeys();
  return parseEntries(source).map(({ key, type, fields }) => {
    const meta = META[key];
    const isLab = (first: string, last: string) => {
      const given = first.replace(/\./g, " ").trim().split(/\s+/)[0] ?? "";
      const key = given.length > 1 ? `~${given.slice(0, 3).toLowerCase()}` : given.toLowerCase();
      return lab.has(`${last.toLowerCase()}|${key}`);
    };
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();
    // Prefer the fetched list: it has full given names and ORCIDs and is never
    // truncated with "and others". Fall back to the .bib list (initials).
    const authors: Author[] = meta?.authors?.length
      ? meta.authors.map((a) => ({
          name: clean([a.given.replace(/\b([A-Z])(?=\s|$)/g, "$1."), a.family].filter(Boolean).join(" ")),
          bold: isLab(clean(a.given), clean(a.family)),
          ...(a.orcid ? { orcid: a.orcid } : {}),
        }))
      : splitAuthors(fields.author ?? "").map((a) =>
          a.isOthers
            ? { name: "et al.", bold: false }
            : { name: formatAuthor(a), bold: isLab(a.first, a.last) },
        );
    const chips = buildChips(fields);
    const abstract = fields.abstract ? decodeLatex(fields.abstract) : meta?.abstract;
    return {
      key,
      type,
      authors,
      year: Number(fields.year) || 0,
      title: decodeLatex(fields.title ?? ""),
      venue: decodeLatex(fields.journal ?? fields.booktitle ?? ""),
      selected: (fields.selected ?? "").toLowerCase() === "true",
      award: fields.award ? decodeLatex(fields.award) : undefined,
      chips,
      abstract: abstract ? tidyAbstract(abstract) : undefined,
      summary: (paperSummaries as Record<string, string> | null)?.[key]?.trim(),
      doi: fields.doi,
      arxiv: fields.arxiv?.replace(/^arxiv:/i, ""),
      pdf: fields.pdf,
      primaryUrl: chips.find((c) => c.label !== "Code" && c.label !== "Slides")?.href,
    };
  });
}

const ALL_PAPERS = loadAll();

export function getAllPapers(): Paper[] {
  return [...ALL_PAPERS].sort((a, b) => b.year - a.year);
}

export function paperPath(p: Paper): string {
  return `/publications/${p.key}/`;
}

/** schema.org ScholarlyArticle for JSON-LD. */
export function paperJsonLd(p: Paper, site: URL | undefined): Record<string, unknown> {
  const url = site ? new URL(paperPath(p), site).toString() : paperPath(p);
  const sameAs = [
    p.doi && `https://doi.org/${p.doi}`,
    p.arxiv && `https://arxiv.org/abs/${p.arxiv}`,
    ...p.chips.filter((c) => /^https?:/.test(c.href) && c.label !== "Code").map((c) => c.href),
  ].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);
  return {
    "@type": "ScholarlyArticle",
    "@id": url,
    url,
    headline: p.title,
    name: p.title,
    datePublished: String(p.year),
    author: p.authors
      .filter((a) => a.name !== "et al.")
      .map((a) =>
        // Point the PI's authorship at the Person node defined site-wide.
        /^L(ogan)?\.? Grosenick$/.test(a.name)
          ? { "@type": "Person", "@id": new URL("/pi/#person", site ?? "https://grosenicklab.org").toString(), name: "Logan Grosenick" }
          : { "@type": "Person", name: a.name, ...(a.orcid ? { sameAs: a.orcid } : {}) },
      ),
    ...(p.venue ? { isPartOf: { "@type": "Periodical", name: p.venue } } : {}),
    ...(p.summary ? { description: p.summary } : {}),
    ...(p.abstract ? { abstract: p.abstract } : {}),
    ...(p.doi ? { identifier: { "@type": "PropertyValue", propertyID: "DOI", value: p.doi } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function getSelectedPapers(): Paper[] {
  return ALL_PAPERS.filter((p) => p.selected).sort((a, b) => b.year - a.year);
}

export function getPapersByYear(): Array<{ year: number; papers: Paper[] }> {
  const groups = new Map<number, Paper[]>();
  for (const p of ALL_PAPERS) {
    if (!groups.has(p.year)) groups.set(p.year, []);
    groups.get(p.year)!.push(p);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, papers]) => ({ year, papers }));
}

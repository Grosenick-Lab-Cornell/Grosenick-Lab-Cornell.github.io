import { readFileSync } from "node:fs";
import path from "node:path";
import peopleData from "@/content/people.yaml";

export type Author = { name: string; bold: boolean };
export type Chip = { label: string; href: string };
export type Paper = {
  key: string;
  authors: Author[];
  year: number;
  title: string;
  venue: string;
  selected: boolean;
  award?: string;
  chips: Chip[];
};

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

function labLastNameSet(): Set<string> {
  const set = new Set<string>();
  const people = peopleData as Array<{ name: string }>;
  for (const p of people) {
    const cleaned = p.name
      .replace(/,\s*(PhD|MD-PhD|MD).*$/i, "")
      .replace(/"[^"]*"/g, "")
      .trim();
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    set.add(tokens[tokens.length - 1].toLowerCase());
    if (tokens.length >= 3) {
      set.add(tokens.slice(-2).join(" ").toLowerCase());
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
  const lab = labLastNameSet();
  return parseEntries(source).map(({ key, fields }) => {
    const split = splitAuthors(fields.author ?? "");
    const authors: Author[] = split.map((a) => {
      if (a.isOthers) return { name: "…", bold: false };
      return {
        name: formatAuthor(a),
        bold: lab.has(a.last.toLowerCase()),
      };
    });
    return {
      key,
      authors,
      year: Number(fields.year) || 0,
      title: decodeLatex(fields.title ?? ""),
      venue: decodeLatex(fields.journal ?? fields.booktitle ?? ""),
      selected: (fields.selected ?? "").toLowerCase() === "true",
      award: fields.award ? decodeLatex(fields.award) : undefined,
      chips: buildChips(fields),
    };
  });
}

const ALL_PAPERS = loadAll();

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

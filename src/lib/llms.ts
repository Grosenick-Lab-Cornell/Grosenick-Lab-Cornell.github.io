import { getCollection } from "astro:content";
import siteConfig from "@/content/site.yaml";
import { frontmatter as pi } from "@/content/pi.md";
import { getAllPapers, paperPath } from "@/lib/papers";
import software from "@/content/software.yaml";

/**
 * Plain-Markdown summary of the lab for LLM crawlers (llms.txt convention).
 * `full` adds every paper's abstract; the short version lists titles only.
 */
export async function buildLlmsTxt(site: URL, full: boolean): Promise<string> {
  const abs = (p: string) => new URL(p, site).toString();
  const themes = (await getCollection("research")).sort((a, b) => a.data.order - b.data.order);
  const links = (pi.links ?? {}) as Record<string, string>;
  const ids = [
    links.orcid && `ORCID: ${links.orcid}`,
    links.scholar && `Google Scholar: ${links.scholar}`,
    links.vivo && `Weill Cornell profile: ${links.vivo}`,
  ].filter(Boolean);

  const lines: string[] = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.tagline.trim()} ${siteConfig.affiliationLine}`,
    "",
    `Principal investigator: ${pi.name}, ${pi.title}, ${siteConfig.institution}. ${ids.join(" · ")}`,
    "",
    "## Pages",
    "",
    `- [Research](${abs("/research/")}): research themes`,
    `- [Publications](${abs("/publications/")}): full publication list; each paper also has its own page`,
    `- [People](${abs("/people/")}): current members and alumni with current positions`,
    `- [Principal investigator](${abs("/pi/")}): biography of ${pi.name}`,
    `- [Join](${abs("/join/")}): open positions`,
    "",
    "## Research themes",
    "",
    ...themes.map((t) => `- **${t.data.title}**: ${(t.body ?? "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/\s+/g, " ").trim()}`),
    "",
    "## Software",
    "",
    ...(software as Array<{ name: string; blurb: string; url?: string }>).map(
      (s) => `- [${s.name}](${s.url ?? abs("/#software")}): ${s.blurb.replace(/\s+/g, " ").trim()}`,
    ),
    "",
    full ? "## Publications (with abstracts)" : "## Publications",
    "",
  ];

  for (const p of getAllPapers()) {
    const authors = p.authors.map((a) => a.name).join(", ");
    const meta = [String(p.year), p.venue, p.doi && `doi:${p.doi}`, p.arxiv && `arXiv:${p.arxiv}`]
      .filter(Boolean)
      .join(" · ");
    if (full) {
      lines.push(`### [${p.title}](${abs(paperPath(p))})`, "", `${authors}. ${meta}.`, "");
      if (p.abstract) lines.push(p.abstract, "");
    } else {
      lines.push(`- [${p.title}](${abs(paperPath(p))}): ${meta}`);
    }
  }
  if (!full) lines.push("", `Abstracts for every paper: ${abs("/llms-full.txt")}`);
  return lines.join("\n") + "\n";
}

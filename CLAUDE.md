# Grosenick Lab website — build brief

This document is the spec for building **grosenicklab.org**. It is written to be
executed by Claude Code. Work through it in the phases at the bottom; each phase
has acceptance criteria. Ask before deviating from the stack or content model.

---

## 1. Goal

Replace the current Super/Notion site with a fast, maintainable static site
hosted on GitHub Pages at the apex domain `grosenicklab.org`. The lab is the
**Grosenick Lab at Weill Cornell Medicine** — machine learning + neuroengineering
for precision psychiatry (PI: Logan Grosenick).

Two reference sites set the bar:

- **lindermanlab.github.io** — borrow: one figure per research theme; team photo
  grid with external links; an **Alumni** block with "now at…" lines; and a
  **publications list grouped by year, each entry with Paper/arXiv/bioRxiv/Code
  links and bolded lab-member names**. This is the most important pattern to nail.
- **grewelab.org** — borrow: image-forward hero, a short "vision" block, and a
  clearly hireable / "join us" feel.

**Aesthetic direction (confirmed):** light, airy, and image-forward — drawn from
the lab's current Super/Notion site (clean whitespace, near-monochrome, soft
cards) and the Mathis Lab (mackenziemathislab.org: bold headline with key terms
emphasized, software tiles with circular logo badges, a lively seasonal news
feed). This **replaces** the earlier dark-navy prototype. Keep a single warm
accent (signal-rose) used sparingly, and a light hero figure card (the connectome
graphic lives inside it, not as a dark full-bleed band). Reference mockup:
`light-direction.html`.

## 1b. Site purpose & audience

The site serves **two audiences equally: potential hires and potential funders.**
They want to believe the same thing — "this lab does important work and executes
on it" — but read the evidence differently. Hires weight people, culture,
mentorship, and trainee outcomes; funders weight significance, credibility,
productivity, and what's distinctive. Design rule: **every major section must
satisfy both lenses**, with **gravitas up top (mission, research) and warmth
lower down (news, people).**

What each section must do for each audience:

| Section | For funders | For hires |
|---|---|---|
| Hero / mission | name the stakes + distinctive bench-to-clinic bet | "is this important and exciting?" |
| Research | significance/impact first, then method | "what would I actually work on?" |
| Software | credible, used tools | "real engineering happens here" |
| Publications | venue prestige + productivity | "rigorous and active" |
| Funding/Support | social proof, stability | reassurance the lab is resourced |
| News | momentum, awards already won | thriving, celebratory culture |
| People + Alumni | produces successful scientists | mentorship + where trainees land |
| Join / PI page | team can execute | the mentor + how to apply |

**Copy direction (applies throughout):**
- **Mission must be significance-first.** Not "we build computational tools."
  Lead with the human burden of mental illness, that precision psychiatry is the
  frontier, and that this lab is distinctive in spanning ML methods +
  neuroengineering + the clinic at Weill Cornell. This paragraph does the most
  persuasive work on the page — write it carefully (draft with the PI).
- **Each research area leads with the payoff** (clinical/scientific "so what")
  before the method.
- **Tone is split on purpose:** mission + research read with gravitas; news +
  people keep the Mathis-style warmth (emoji, congratulations). The light
  aesthetic already signals "serious but human" — lean on it.
- **Alumni "now at…" outcomes are a priority element**, not an afterthought —
  best dual-purpose signal available. If the alumni list is thin, lean on
  current-member awards in News instead.

## 2. Stack

- **Astro** (static output, no SSR) + **Tailwind CSS**.
- **Content collections** for data (`astro:content`) with Zod-validated schemas.
- **Publications parsed from a BibTeX file at build time** (use `astro-citation`
  or a small `@citation-js/core` build step — pick the simplest that yields
  grouped, link-annotated entries).
- Deployed to **GitHub Pages via GitHub Actions** (`withastro/action`).
- No client JS except the hero canvas + the mobile nav toggle. Keep it light.

> Alternative considered: **al-folio** (Jekyll) gives publications/people/news
> out of the box with less code, but it's "adopt a big theme and configure"
> rather than "build a bespoke site," and it's harder to match the prototype's
> identity. Default to Astro unless the user asks for al-folio.

## 3. Visual identity (light direction — see `light-direction.html`)

Design tokens — put these in `tailwind.config` / CSS vars:

```
--paper   #FFFFFF      page background (light, airy)
--wash    #F6F8F9      alt sections / news band / soft cards
--ink     #15202B      body text
--muted   #5A6B79      secondary text
--faint   #8A98A4      captions / meta
--line    #E8ECEF      hairlines / card borders
--signal       #EC4D7D   accent (fluorescent-imaging rose) — sparingly
--signal-ink   #CC356C   accent for link text (AA contrast on white)
```

Type:
- Display / headings / nav / tile titles: **Space Grotesk** (500–700). Hero
  headline emphasizes key terms in bold + the accent (Mathis pattern:
  "Machine learning & neurotechnology for **precision psychiatry**").
- Body / long-form: **Inter** (clean sans, matches the Super/Notion feel).
  *(Note: this drops the earlier Newsreader serif to match the references; if the
  PI wants a touch of serif warmth, Newsreader can return for long-form pages only.)*
- Labels / meta / code-language chips: **Space Mono**.

Layout feel: generous whitespace, soft 14px-radius cards with hairline borders,
near-monochrome with rose as the only color; let images/figures carry the color
(Mathis-style). Avoid heavy dividers and dense chrome.

Signature elements:
- **Software tiles** with circular gradient logo badges (QuantNets / EpiCare /
  CLEAN), Mathis-style — promote the lab's code on the homepage.
- A light **hero figure card** containing the ambient connectome canvas (drifting
  nodes + proximity edges, a few in `--signal`), with a small caption. Port the
  canvas JS from `light-direction.html`; respect `prefers-reduced-motion`.
- A **lively, grouped news feed** (by season/period), emoji allowed, congratulation-
  style, with inline links — Mathis-style.

Quality floor: responsive to ~360px, visible keyboard focus, reduced-motion
respected, Lighthouse ≥95, fonts preloaded to avoid layout shift.

## 4. Information architecture

A rich single-scroll **homepage** plus a few dedicated pages (hybrid of the two
references):

- `/` — Hero (figure card) · Software tiles · Research themes · Selected
  publications (5–6) · **Funding/Support strip** · News (lively, grouped) ·
  Join/Contact
- `/research/` — full research themes, one figure each (Linderman-style); each
  area leads with its significance/payoff (funder), then the approach (hire)
- `/people/` — current members grid + **Alumni** with "now at…" lines (prominent)
- `/pi/` (or `/grosenick/`) — PI bio: credentials, vision, advising philosophy,
  plus **copy-paste "bios for talks & introductions"** at three lengths (speaker
  intro / short / one-line) in a clearly-labeled, easy-to-grab block. Source: `pi.md`.
- `/publications/` — full list, grouped by year, filter by type (optional)
- `/funding/` — funders/sponsors with logos + short descriptions
- `/join/` — openings, what the lab looks for, what it offers, how to apply
- (optional) `/teaching/` if there are courses to list

Sticky top nav: Research · Software · Publications · People · News · Join. Brand
mark links to `/`. Mobile: collapse nav to a toggle.

## 5. Content model (the important part)

All editable content lives in `src/content/` so updating the site = editing data,
never markup.

### 5.1 Publications — `src/content/papers.bib`
A standard BibTeX file. Build step renders, **grouped by year (desc)**, each entry:
`Authors (year). Title. *Venue*.` followed by link chips for whichever of these
exist: `paper`, `arxiv`, `biorxiv`, `medrxiv`, `code`, `pdf`, `slides`.
Conventions:
- **Bold** any author whose name matches the lab roster (Grosenick + members).
- Support a `selected = {true}` tag to surface entries in the homepage section.
- Support an `award` field rendered as a small highlighted note (e.g. "Spotlight").
- Author-name matching must handle "Grosenick, L." and "L. Grosenick" forms.

### 5.2 People — `src/content/people/*.yaml` (or one `people.yaml`)
Schema (Zod):
```
name: string
role: string            # "Principal Investigator", "Postdoctoral Fellow", ...
photo: string           # /images/people/<file>  (graceful initials fallback)
url?: string            # personal site / scholar / linkedin
coadvisor?: string
status: "current" | "alumni"
joined?: string         # "2024"
alumniNote?: string     # "now Asst. Prof. at …"  (alumni only)
order?: number          # PI pinned first
```
Render current members as a photo grid (initials tile fallback when `photo`
missing); render alumni in a denser list with `alumniNote`.

### 5.3 Research themes — `src/content/research/*.md`
Frontmatter: `title`, `figure` (image path), `figureCaption` (may contain pub
citation links), `order`. Body is Markdown. Themes to seed (verify with PI):
graph neural networks, multimodal learning, dimensionality reduction, large-scale
neural data collection.

### 5.4 News — `src/content/news/*.md` or `news.yaml`
`date`, `body` (Markdown, may link). Sort desc, show ~6 on home, all on a page if
it grows.

### 5.6 Software — `src/content/software.yaml`
List of projects shown as homepage tiles: `name`, `blurb`, `lang` (e.g. "Python"),
`url` (repo), `badge` (2-letter initials) and/or `logo` (image path). Seed with
QuantNets, EpiCare, CLEAN.

### 5.7 Funding / Support — `src/content/funding.yaml`
List of funders/sponsors for the support strip + funding page: `name`, `logo`
(image path), `url?`. A homepage strip shows logos in greyscale → color on hover;
an optional `/funding` page can add short descriptions. (Funder-facing credibility
signal; also reassures hires about stability.)

### 5.8 Site config — `src/content/site.yaml`
Lab name, tagline, affiliation line, contact email (`log4002@med.cornell.edu`),
GitHub org (`Grosenick-Lab-Cornell`), Bluesky/X handles, nav items.

## 6. Component inventory

```
Layout.astro            head, fonts preload, nav, footer, theme tokens
Nav.astro               sticky nav + mobile toggle
Hero.astro              light hero: figure card w/ connectome canvas + headline + affiliation
SoftwareTiles.astro     circular-badge project tiles (data: software.yaml)
ResearchGrid.astro      theme cards (home)  /  ResearchTheme.astro (full page, figure+prose)
PubList.astro           grouped-by-year list; props: { selectedOnly?: boolean }
PubEntry.astro          one entry + link chips + bolded authors
PersonCard.astro        photo/initials + name + role + link
PeopleGrid.astro        current grid; AlumniList.astro for alumni
NewsFeed.astro          lively, grouped-by-period items (emoji + inline links, Mathis-style)
FundingStrip.astro      greyscale→color funder logos (data: funding.yaml)
PiBio.astro             PI bio block / page: photo, credentials, vision, advising
ContactBand.astro       blurb + email CTA + social links
VisionBlock.astro       (optional, Grewe-style) 2–3 vision bullets
```

## 7. Repo structure

```
/
├─ astro.config.mjs        # site: 'https://grosenicklab.org'
├─ tailwind.config.mjs
├─ public/
│  ├─ CNAME                # contains: grosenicklab.org   (already created)
│  └─ images/…             # people photos, research figures, og image
├─ src/
│  ├─ content/             # papers.bib, people, research, news, site.yaml
│  ├─ components/          # see §6
│  ├─ layouts/Layout.astro
│  ├─ pages/               # index, research, people, publications, join
│  └─ styles/tokens.css
└─ .github/workflows/deploy.yml
```

## 8. Deployment

1. `astro.config.mjs`: `site: 'https://grosenicklab.org'` (apex → no `base`).
2. Keep **`public/CNAME`** containing `grosenicklab.org` so it lands in the build.
3. `.github/workflows/deploy.yml` using `withastro/action` + `actions/deploy-pages`,
   triggered on push to `main`. In repo **Settings → Pages**, set Source =
   **GitHub Actions**.
4. Repo: an org repo named `Grosenick-Lab-Cornell.github.io` serves the apex
   cleanly. Set the custom domain in Settings → Pages and add the verification
   TXT record GitHub provides.
5. **DNS** (at the registrar — currently pointing at Super, must be replaced):
   - delete apex A `76.76.21.21` and `www` CNAME → `cname.super.so`
   - apex `@` → A records `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`
     (optionally AAAA `2606:50c0:8000::153` … `8003::153`)
   - `www` → CNAME `grosenick-lab-cornell.github.io`
   - add GitHub's verification TXT record
6. Once apex **and** `www` resolve to GitHub, enable **Enforce HTTPS**. If the
   cert was issued early and misses a name, remove/re-add the custom domain to
   force regeneration.

## 9. Build phases (do in order; meet acceptance criteria before moving on)

**Phase 0 — Scaffold.** Astro + Tailwind + tokens + fonts; empty pages route;
deploy workflow green on a "hello" page at a Pages preview. *Done when:* a
deployed page renders with the brand fonts/colors.

**Phase 1 — Home shell.** Layout, Nav (with mobile toggle), Hero with the ported
connectome canvas, ContactBand, footer. *Done when:* homepage matches the
prototype hero and is responsive to 360px with reduced-motion handled.

**Phase 2 — Content collections.** Define schemas (§5); seed `site.yaml`,
research themes, people (PI + current 4–5), news from the items below. *Done
when:* `astro check` passes and home renders Research/News/People from data.

**Phase 3 — Publications.** Wire up the `.bib` pipeline; PubList + PubEntry with
year grouping, link chips, bolded lab authors, `selected`/`award` support.
Home shows selected; `/publications` shows all. *Done when:* adding a BibTeX
entry appears correctly with working links and no markup edits.

**Phase 4 — Pages.** `/research`, `/people` (+ alumni), `/join`. *Done when:* all
nav targets resolve and read well on mobile.

**Phase 5 — Polish.** OG image, favicon, meta tags, sitemap, 404, Lighthouse
≥95, axe a11y pass. *Done when:* metrics hit and a fresh clone builds clean.

## 10. Starter content (provided) & still needed

**Provided** — real data files generated from the PI's CV live in
`starter-content/` (drop into `src/content/`):
- `site.yaml` — config, contact, nav, headline/tagline
- `papers.bib` — representative selected publications (replace with full Scholar/
  Zotero export; keep the `selected`/`award`/`doi`/`arxiv`/`code` fields)
- `people.yaml` — full roster: PI + 8 current members + 12 alumni **with real
  "now at…" outcomes** (UConn, Duke, Anthropic, Nvidia, BCG, top MD/PhD programs)
- `funding.yaml` — real **awarded** research funders (NIMH, NIH ORIP,
  NIA/PennAITech, Simons, Whitehall, Feldstein, Wellcome Leap) + trainee
  fellowships. **No pending/under-review funding may be listed.**
- `software.yaml` — QuantNets, EpiCare, CLEAN
- `research/*.md` — four significance-first themes (subtyping, personalization,
  methods, neuroengineering)
- `news.yaml` — seeded, grouped news
- `MISSION.md` — mission paragraph draft + variants + hero headline options
- `pi.md` — PI page: full bio + copy-paste speaker/short/one-line intros, training,
  links (a "give a clean copy/paste UX" block so a host can grab a blurb fast)

**Still needed from the lab (don't invent)** — see `IMAGE-ASSETS.md` for the
exact filenames/sizes (they already match the data files):
- Member + PI **photos** → `public/images/people/`. Source current members + PI
  from the existing site (grosenicklab.super.site, team page) — note it blocks
  automated download, so they're saved by hand and renamed. Alumni from personal
  sites/LinkedIn or left as initials.
- **Funder logos** (official brand kits) → `public/images/funders/`.
- **Research figures** (real paper figures) → `public/images/research/`.
- A **hero/OG image** if desired (else the connectome card stands in).
- PI to **finalize the mission + bio** (see `MISSION.md`, `pi.md`) and `/join` text.
- Verify roster membership/titles, co-advisors, and news dates.
```

# Image asset checklist

Drop files at the exact paths below and they wire up automatically — the
filenames already match `people.yaml`, `funding.yaml`, and the `research/*.md`
captions. Anything missing falls back gracefully (initials for people; the strip
just omits a missing logo), so the site builds before every asset is in.

**Specs at a glance**
- People headshots: **square**, ≥ 600×600 px, JPG or WebP, face centered.
- Funder logos: **SVG** preferred (else transparent PNG ≥ 200 px tall). The strip
  renders them greyscale → color on hover, so a single full-color file is fine.
- Research figures: landscape, ~1200 px wide, JPG or WebP. Use figures the lab
  owns or has permission to reuse.

---

## 1. People → `public/images/people/`

**Current members + PI — source from the existing site (grosenicklab.super.site,
team page).** Heads up: that site blocks automated download, so save each photo
by hand (right-click → Save image, or export from the underlying Notion source)
and rename to match:

- `logan-grosenick.jpg`
- `marzieh-ajirak.jpg`
- `karsten-gimre.jpg`
- `ruchi-sandilya.jpg`
- `nathaniel-tse.jpg`
- `neil-gallagher.jpg`
- `isabella-karabinas.jpg`
- `jiarui-olivia-ao.jpg`
- `jordan-serrano-guedea.jpg`

**Alumni — likely not on the current site.** Best sources are their personal
sites / LinkedIn / lab pages (or skip — alumni render as initials cleanly):

- `tim-spellman.jpg`, `amanda-m-buch.jpg`, `isaac-kauvar.jpg`,
  `isaac-osafo-nkansah.jpg`, `mason-hargrave.jpg`, `catherine-parkin.jpg`,
  `sanweda-mahagabin.jpg`, `sumaira-perez.jpg`, `ellie-rose-bowen.jpg`,
  `grace-yu.jpg`, `alisha-dua.jpg`, `claire-neely-muscat.jpg`

> When you add a file, set the matching `photo:` value in `people.yaml` (the path
> is already in a comment next to each person — just uncomment/fill it).

## 2. Funder logos → `public/images/funders/`

From each funder's official brand/press kit:

- `nimh.svg` — National Institute of Mental Health
- `nih.svg` — NIH (for the ORIP grant)
- `nia.svg` — National Institute on Aging / PennAITech
- `simons.svg` — Simons Foundation
- `whitehall.svg` — Whitehall Foundation
- `feldstein.svg` — Feldstein Medical Foundation
- `wellcome-leap.svg` — Wellcome Leap

*(Keck removed — list only awarded funding.)*

## 3. Research figures → `public/images/research/`

Captions already live in each `research/*.md`. Use real paper figures (with
permission):

- `subtyping.jpg` — depression/autism biological subtypes
- `digital-twins.jpg` — counterfactual treatment personalization
- `quantnets.jpg` — graph CNN / QuantNets schematic
- `tms-eeg.jpg` — TMS-EEG / closed-loop stimulation

## 4. Site-level → `public/`

- `public/images/og.jpg` — Open Graph / social preview, 1200×630 px (optional;
  else the hero connectome card stands in).
- `public/favicon.svg`
- `public/grosenick-cv.pdf` — linked from the PI page (`pi.md`).

---

### Optional but nice
A hero image. The mockup uses the generated connectome card, which works on its
own — but a real lab figure (a connectome, model schematic, or brain-imaging
panel) in `public/images/hero.jpg` would make the hero land harder, Mathis-style.

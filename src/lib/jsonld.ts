import siteConfig from "@/content/site.yaml";
import { frontmatter as pi } from "@/content/pi.md";

/**
 * schema.org Person for the PI. `sameAs` (ORCID, Scholar, institutional
 * profile, socials) is what lets search engines and LLMs tie the site, the
 * papers, and the person together as one entity.
 */
export function piPersonJsonLd(site: URL | undefined): Record<string, unknown> {
  const links = (pi.links ?? {}) as Record<string, string>;
  const sameAs = ["orcid", "scholar", "vivo", "ncbi", "linkedin", "bluesky", "twitter"]
    .map((k) => links[k])
    .filter((v) => v && /^https?:/.test(v));
  return {
    "@type": "Person",
    "@id": site ? new URL("/pi/#person", site).toString() : "/pi/#person",
    name: pi.name,
    jobTitle: pi.title,
    url: site ? new URL("/pi/", site).toString() : "/pi/",
    ...(pi.photo && site ? { image: new URL(pi.photo, site).toString() } : {}),
    affiliation: {
      "@type": "CollegeOrUniversity",
      name: siteConfig.institution,
      parentOrganization: { "@type": "CollegeOrUniversity", name: siteConfig.university },
    },
    alumniOf: [
      { "@type": "CollegeOrUniversity", name: "Stanford University" },
      { "@type": "CollegeOrUniversity", name: "Columbia University" },
    ],
    knowsAbout: [
      "Machine learning",
      "Precision psychiatry",
      "Neuroengineering",
      "Depression subtypes",
      "Transcranial magnetic stimulation",
      "Fiber photometry",
      "Light-field microscopy",
      "Computational neuroscience",
    ],
    sameAs,
  };
}

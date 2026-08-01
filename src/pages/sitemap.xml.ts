import type { APIRoute } from "astro";

const ROUTES = [
  { path: "/", priority: "1.0", changefreq: "monthly" },
  { path: "/research/", priority: "0.8", changefreq: "monthly" },
  { path: "/publications/", priority: "0.8", changefreq: "monthly" },
  { path: "/people/", priority: "0.7", changefreq: "monthly" },
  { path: "/pi/", priority: "0.6", changefreq: "yearly" },
  { path: "/join/", priority: "0.7", changefreq: "monthly" },
];

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error("astro.config.mjs must set `site` for sitemap generation.");
  }
  const urls = ROUTES.map(
    ({ path, priority, changefreq }) =>
      `  <url>\n    <loc>${new URL(path, site).toString()}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
  ).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};

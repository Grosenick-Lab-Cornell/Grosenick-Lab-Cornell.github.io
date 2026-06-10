import { existsSync } from "node:fs";
import path from "node:path";

export function publicAssetExists(href?: string): boolean {
  if (!href) return false;
  const rel = href.replace(/^\//, "");
  return existsSync(path.resolve("public", rel));
}

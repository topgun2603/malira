/**
 * Slugs are built from the English title. Tamil titles are stored alongside but
 * never used for the URL — a Tamil-script slug would be mangled by every share
 * target the app hands off to (WhatsApp in particular).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
}

export function suffixedSlug(base: string, suffix: string): string {
  const clean = slugify(base);
  return clean ? `${clean}-${suffix}` : suffix;
}

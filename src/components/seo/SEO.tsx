import { Helmet } from "react-helmet-async";

const SITE = "https://trackmint-ashen.vercel.app";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-route head: unique <title>, <meta description>, self-referencing canonical
 * and og:url, page-specific og:* tags, optional JSON-LD.
 *
 * The sitewide og:image stays in index.html as a fallback for non-JS social
 * crawlers; per-route og:title/og:description dedupe by property for JS-capable
 * crawlers (Googlebot).
 */
export default function SEO({ title, description, path, jsonLd }: SEOProps) {
  const url = `${SITE}${path}`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
      ))}
    </Helmet>
  );
}

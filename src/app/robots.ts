import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/console", "/rider", "/checkout", "/orders", "/account", "/login", "/api"] },
    sitemap: site ? `${site}/sitemap.xml` : undefined,
  };
}

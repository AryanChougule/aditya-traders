import type { MetadataRoute } from "next";
import { getSettings } from "@/server/catalog";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const STORE = await getSettings();
  return {
    name: STORE.name,
    short_name: STORE.shortName,
    description: STORE.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f5",
    theme_color: "#047857",
    lang: "en-IN",
    categories: ["shopping", "food"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search", url: "/search" },
      { name: "My orders", url: "/orders" },
    ],
  };
}

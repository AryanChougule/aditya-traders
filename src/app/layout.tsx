import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Nunito_Sans, Rubik } from "next/font/google";
import { Providers } from "@/components/providers";
import { getSettings } from "@/server/catalog";
import "./globals.css";

const heading = Rubik({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// Hindi product names; not preloaded so English-only pages don't pay for it.
const deva = Noto_Sans_Devanagari({
  variable: "--font-deva",
  subsets: ["devanagari"],
  weight: ["400", "600"],
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    metadataBase: site ? new URL(site) : undefined,
    title: { default: `${s.name} · Groceries delivered`, template: `%s · ${s.name}` },
    description: `Order groceries from ${s.name}. Fresh vegetables, atta, dal, dairy and daily essentials delivered to your door or ready for pickup.`,
    applicationName: s.name,
    appleWebApp: { capable: true, title: s.shortName, statusBarStyle: "default" },
    openGraph: { type: "website", siteName: s.name, locale: "en_IN" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#047857" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1210" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <html lang="en-IN" className={`${heading.variable} ${body.variable} ${deva.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers settings={settings}>{children}</Providers>
      </body>
    </html>
  );
}

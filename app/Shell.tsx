import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sans = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: "400", variable: "--font-mono" });

// The page in each language has its own root layout, so <html lang> is right before any script runs.
export default function Shell({ lang, children }: { lang: "de" | "en"; children: ReactNode }) {
  return (
    <html lang={lang} className={`${sans.variable} ${mono.variable}`}>
      <body id="top">{children}</body>
    </html>
  );
}

export const shared = {
  // the pitch link is pasted into mail, LinkedIn and chat, so it needs a preview card
  metadataBase: new URL("https://weinig.vercel.app"),
  icons: "/img/logo.png",
  // a private pitch link, never a search result
  robots: { index: false, follow: false },
  alternates: { languages: { de: "/", en: "/en" } },
};

// title and description go to the tab and the link preview alike
export const meta = (title: string, description: string, url: string, locale: string) => ({
  ...shared, title, description,
  openGraph: { title, description, url, locale, type: "website" as const, siteName: "WEINIG", images: [{ url: "/img/hero-halle.jpg", width: 1600, height: 900 }] },
});

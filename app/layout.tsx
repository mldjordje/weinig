import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const sans = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: "400", variable: "--font-mono" });

export const metadata: Metadata = {
  title: "WEINIG | Maschinen und Anlagen für Massivholz und Holzwerkstoffe",
  description: "Konzeptentwurf: vom Rohholz zum fertigen Fenster mit der WEINIG Gruppe.",
  icons: "/img/logo.png",
  // a private pitch link, never a search result
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${mono.variable}`}>
      <body id="top">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Shell, { meta } from "../../Shell";

export const metadata: Metadata = meta(
  "WEINIG | Machines and plants for solid wood and wood-based materials",
  "Concept draft: from rough timber to the finished window with the WEINIG Group.",
  "/en", "en_GB",
);

export default function Layout({ children }: { children: ReactNode }) {
  return <Shell lang="en">{children}</Shell>;
}

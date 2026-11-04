import type { Metadata } from "next";
import type { ReactNode } from "react";
import Shell, { shared } from "../../Shell";

export const metadata: Metadata = {
  ...shared,
  title: "WEINIG | Machines and plants for solid wood and wood-based materials",
  description: "Concept draft: from rough timber to the finished window with the WEINIG Group.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <Shell lang="en">{children}</Shell>;
}

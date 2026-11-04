import type { Metadata } from "next";
import type { ReactNode } from "react";
import Shell, { shared } from "../Shell";

export const metadata: Metadata = {
  ...shared,
  title: "WEINIG | Maschinen und Anlagen für Massivholz und Holzwerkstoffe",
  description: "Konzeptentwurf: vom Rohholz zum fertigen Fenster mit der WEINIG Gruppe.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <Shell lang="de">{children}</Shell>;
}

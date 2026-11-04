import type { Metadata } from "next";
import type { ReactNode } from "react";
import Shell, { meta } from "../Shell";

export const metadata: Metadata = meta(
  "WEINIG | Maschinen und Anlagen für Massivholz und Holzwerkstoffe",
  "Konzeptentwurf: vom Rohholz zum fertigen Fenster mit der WEINIG Gruppe.",
  "/", "de_DE",
);

export default function Layout({ children }: { children: ReactNode }) {
  return <Shell lang="de">{children}</Shell>;
}

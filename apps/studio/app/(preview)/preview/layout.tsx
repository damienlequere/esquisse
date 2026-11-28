import type { ReactNode } from "react";
import "./preview.css";

// The preview, in its own document: the studio opens it in a window the
// size of a phone, styled as the web site is (see preview.css).
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

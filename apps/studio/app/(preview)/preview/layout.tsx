import type { ReactNode } from "react";
import "./preview.css";

// The preview, in its own document: the studio shows it in an iframe, a
// device's frame, styled as the web site is (see preview.css).
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

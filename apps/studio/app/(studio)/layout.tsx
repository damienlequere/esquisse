import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Jobs } from "../../components/jobs/Jobs.tsx";
import "./studio.css";

export const metadata: Metadata = { title: "Esquisse Studio" };

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Jobs>{children}</Jobs>
      </body>
    </html>
  );
}

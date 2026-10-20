import type { Metadata } from "next";
import { Screen } from "../../components/Screen.tsx";

export const metadata: Metadata = { title: "Frame example" };

export default function FramePage() {
  return <Screen />;
}

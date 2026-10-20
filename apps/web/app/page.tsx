import { APP_NAME, TAGLINE } from "@template/shared";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-serif text-4xl font-semibold">{APP_NAME}</h1>
      <p className="mt-3 text-lg text-stone-600 dark:text-stone-300">{TAGLINE}</p>
      <Link
        href="/frame"
        className="mt-8 block rounded-lg border border-stone-300 bg-white p-5 transition hover:border-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-amber-400"
      >
        <span className="font-serif text-xl font-semibold">Frame example</span>
        <span className="mt-1 block text-sm text-stone-500 dark:text-stone-400">
          A page in a device frame: a phone, or a tablet on a large screen.
        </span>
        <span className="mt-3 inline-block text-sm font-medium text-amber-800 dark:text-amber-300">
          Open →
        </span>
      </Link>
    </main>
  );
}

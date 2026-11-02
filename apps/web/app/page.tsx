import { type GameId, games } from "@esquisse/content";
import { APP_NAME, gameSummary, sceneSummary, TAGLINE } from "@esquisse/engine";
import Link from "next/link";

// The games, each one to play from its first scene, and its scenes, each one to
// play alone.
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-serif text-4xl font-semibold">{APP_NAME}</h1>
      <p className="mt-3 text-lg text-stone-600 dark:text-stone-300">{TAGLINE}</p>
      {(Object.keys(games) as GameId[]).map((id) => (
        <section key={id} className="mt-8">
          <Link
            href={`/game/${id}`}
            className="block rounded-lg border border-stone-300 bg-white p-5 transition hover:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-400"
          >
            <span className="font-serif text-xl font-semibold">{games[id].game.title}</span>
            <span className="mt-1 block text-sm text-stone-500 dark:text-stone-400">
              {gameSummary(games[id])}
            </span>
            <span className="mt-3 inline-block text-sm font-medium text-stone-600 dark:text-stone-300">
              Play →
            </span>
          </Link>
          {Object.entries(games[id].scenes).map(([scene, { scene: data }]) => (
            <Link
              key={scene}
              href={`/game/${id}/scene/${scene}`}
              className="mt-3 ml-6 block rounded-lg border border-stone-300 bg-white p-4 transition hover:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-400"
            >
              <span className="font-serif text-lg font-semibold">{data.title}</span>
              <span className="mt-1 block text-sm text-stone-500 dark:text-stone-400">
                {sceneSummary(data)}
              </span>
              <span className="mt-2 inline-block text-sm font-medium text-stone-600 dark:text-stone-300">
                Open →
              </span>
            </Link>
          ))}
        </section>
      ))}
    </main>
  );
}

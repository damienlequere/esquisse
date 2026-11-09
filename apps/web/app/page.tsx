import { type GameId, games } from "@esquisse/content";
import { APP_NAME, gameSummary, TAGLINE } from "@esquisse/engine";
import Link from "next/link";

// The games, each one to play from its first scene, and each of its scenes, to
// play alone at /game/<game>/scene/<id>.
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-serif text-4xl font-semibold">{APP_NAME}</h1>
      <p className="mt-3 text-lg text-stone-600 dark:text-stone-300">{TAGLINE}</p>
      {(Object.keys(games) as GameId[]).map((id) => (
        <section
          key={id}
          className="mt-8 rounded-lg border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900"
        >
          <Link
            href={`/game/${id}`}
            className="block rounded-t-lg p-5 transition hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            <span className="font-serif text-xl font-semibold">{games[id].game.title}</span>
            <span className="mt-1 block text-sm text-stone-500 dark:text-stone-400">
              {gameSummary(games[id])}
            </span>
            <span className="mt-3 inline-block text-sm font-medium text-stone-600 dark:text-stone-300">
              Play →
            </span>
          </Link>
          <ul className="border-t border-stone-200 dark:border-stone-800">
            {Object.entries(games[id].scenes).map(([scene, { scene: s }]) => (
              <li key={scene}>
                <Link
                  href={`/game/${id}/scene/${scene}`}
                  className="flex items-baseline justify-between gap-4 px-5 py-2.5 text-sm transition hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  <span>{s.title}</span>
                  <span className="text-stone-400 dark:text-stone-500">{scene}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

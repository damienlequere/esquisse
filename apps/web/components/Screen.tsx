"use client";

import { APP_NAME, greeting } from "@template/shared";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";

const primary =
  "rounded-md bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-50";

// Reading column: on a large screen (tablet), the text keeps a comfortable line
// length; separators stay full width.
const column = "mx-auto max-w-2xl px-4";

// Dialog that opens in the device frame (#device is positioned, so `absolute`
// stays inside it), not over the whole window. Escape closes it, and the focus
// goes back to where it was.
const Dialog = ({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose(): void;
  children: ReactNode;
}) => {
  const close = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-10">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="absolute top-1/2 left-1/2 max-h-[85%] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-stone-50 p-6 shadow-xl dark:bg-stone-900"
      >
        <h2 id="dialog-title" className="mb-4 text-lg font-semibold">
          {title}
        </h2>
        {children}
        <button
          ref={close}
          type="button"
          onClick={onClose}
          className="mt-6 rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:border-amber-600 dark:border-stone-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Example screen, laid out like a phone app in three bands: the top bar; the
// content, which scrolls; and, fixed at the bottom of the frame, the commands.
export const Screen = () => {
  const [about, setAbout] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-stone-300 dark:border-stone-800">
        <div className={`${column} flex min-h-14 items-center gap-2 py-2`}>
          <p className="min-w-0 flex-1 truncate font-semibold">{APP_NAME}</p>
          <Link
            href="/"
            className="text-sm text-stone-500 underline underline-offset-4 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
          >
            Home
          </Link>
        </div>
      </div>

      {/* The scrollbar gutter is reserved on both sides so the text column stays
          centered like the bars. */}
      <main className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges]">
        <div className={`${column} flex min-h-full items-center justify-center py-6`}>
          <h1 className="text-center font-serif text-2xl font-semibold">{greeting(name)}</h1>
        </div>
      </main>

      <div className="shrink-0 border-t border-stone-300 dark:border-stone-800">
        <form
          className={`${column} flex gap-2 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]`}
          onSubmit={(event) => {
            event.preventDefault();
            setAbout(true);
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 outline-none focus:border-amber-600 dark:border-stone-700 dark:bg-stone-900"
          />
          <button type="submit" className={primary}>
            About
          </button>
        </form>
      </div>

      <Dialog open={about} title="About this frame" onClose={() => setAbout(false)}>
        <p className="text-stone-600 dark:text-stone-300">
          On a large screen with a mouse, the page is shown in a phone frame (a tablet from 1024
          px). On a phone or a touch tablet, it uses the whole screen. This dialog opens inside the
          frame.
        </p>
      </Dialog>
    </div>
  );
};

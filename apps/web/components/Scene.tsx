"use client";

import type {
  Box,
  Character,
  CharacterAspects,
  ObjectBoxes,
  Scene as SceneData,
} from "@esquisse/shared";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { SceneImages } from "../scenes.ts";
import styles from "./Scene.module.css";

// Clickable scene: the background covers the frame, each object is one action,
// each character opens a dialogue. Everything is placed in % of the image, so it
// follows the cropping.

const pct = (v: number) => `${v * 100}%`;
const place = (box: Box) => ({
  left: pct(box.x0),
  top: pct(box.y0),
  width: pct(box.x1 - box.x0),
  height: pct(box.y1 - box.y0),
});

type Line = { text: string; player?: boolean };
type Conversation = { character: Character; lines: Line[]; asked: string[] };

export const Scene = ({
  scene,
  objects,
  aspects,
  images,
}: {
  scene: SceneData;
  objects: ObjectBoxes;
  aspects: CharacterAspects;
  images: SceneImages;
}) => {
  const [rw = 9, rh = 16] = scene.imageRatio.split(":").map(Number);
  const [narration, setNarration] = useState({ title: scene.title, text: scene.intro, key: 0 });
  const [conversation, setConversation] = useState<Conversation>();
  const narrate = (title: string, text: string) =>
    setNarration((n) => ({ title, text, key: n.key + 1 }));

  // ── Dialogue: an open conversation, until it is left ─────────────────────────

  const returnFocus = useRef<HTMLButtonElement>(null);
  const choicesRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);

  const open = (character: Character, from: HTMLButtonElement) => {
    returnFocus.current = from;
    setConversation({ character, lines: [{ text: character.dialogue.greeting }], asked: [] });
  };
  const close = () => {
    if (conversation === undefined) return;
    setConversation(undefined);
    narrate(conversation.character.name, conversation.character.dialogue.farewell);
    returnFocus.current?.focus();
  };
  const ask = (ask: string, answer: string) =>
    setConversation(
      (c) =>
        c && {
          ...c,
          lines: [...c.lines, { text: `— ${ask}`, player: true }, { text: answer }],
          asked: [...c.asked, ask],
        },
    );

  useEffect(() => {
    if (conversation === undefined) return;
    choicesRef.current?.querySelector("button")?.focus();
    linesRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [conversation]);

  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Reveal what is clickable (no hover with a finger) ────────────────────────

  const layer = useRef<HTMLDivElement>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reveal = () => {
    const el = layer.current;
    if (el === null) return;
    el.removeAttribute("data-revealed");
    void el.offsetWidth;
    el.setAttribute("data-revealed", "");
    clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => el.removeAttribute("data-revealed"), 1600);
  };

  return (
    <div className={styles.root}>
      <div className={styles.scene} style={{ "--image-ratio": rw / rh } as CSSProperties}>
        <img className={styles.background} src={images.background.src} alt="" />
        <div ref={layer} className={styles.layer}>
          {scene.objects.map((object) => {
            const box = objects[object.id];
            if (box === undefined) return null;
            return (
              <button
                key={object.id}
                type="button"
                className={styles.hotspot}
                aria-label={object.label}
                style={place(box)}
                onClick={() => narrate(object.label, object.text)}
              >
                <span className={styles.tip}>{object.label}</span>
              </button>
            );
          })}

          {/* Characters: layers placed by their feet. */}
          {scene.characters.map((character) => {
            const { anchor, height } = character;
            // Width as a fraction of the image's width: the image is not square.
            const width = (height * (aspects[character.id] ?? 0.4) * rh) / rw;
            const label = `Parler à ${character.name}`;
            return (
              <button
                key={character.id}
                type="button"
                className={styles.character}
                aria-label={label}
                style={place({
                  x0: anchor.x - width / 2,
                  y0: anchor.y - height,
                  x1: anchor.x + width / 2,
                  y1: anchor.y,
                })}
                onClick={(event) => open(character, event.currentTarget)}
              >
                <img src={images.characters[character.id]?.src} alt="" />
                <span className={styles.tip}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <header className={styles.top}>
        <h1>{scene.title}</h1>
        <button
          type="button"
          className={styles.reveal}
          aria-label="Révéler ce qui est cliquable"
          onClick={reveal}
        >
          ✦
        </button>
      </header>

      <section
        key={narration.key}
        className={`${styles.narration} ${styles.appear}`}
        aria-live="polite"
      >
        <h2>{narration.title}</h2>
        <p>{narration.text}</p>
      </section>

      {conversation && (
        // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: Escape closes it too
        <div
          className={styles.dialogue}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialogue-name"
          >
            <h2 id="dialogue-name">{conversation.character.name}</h2>
            <div ref={linesRef}>
              {conversation.lines.map((line, i) => (
                <p key={i} className={line.player ? styles.player : undefined}>
                  {line.text}
                </p>
              ))}
            </div>
            <div ref={choicesRef} className={styles.choices}>
              {conversation.character.dialogue.topics
                .filter((topic) => !conversation.asked.includes(topic.ask))
                .map((topic) => (
                  <button
                    key={topic.ask}
                    type="button"
                    onClick={() => ask(topic.ask, topic.answer)}
                  >
                    {topic.ask}
                  </button>
                ))}
              <button type="button" onClick={close}>
                Au revoir.
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

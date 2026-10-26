"use client";

import {
  type Character,
  initialSceneState,
  placeStyle,
  playScene,
  REVEAL_MS,
  remainingTopics,
  type SceneData,
  sceneLayout,
  sceneText,
} from "@esquisse/shared";
import { type CSSProperties, useEffect, useReducer, useRef, useState } from "react";
import type { SceneImages } from "../scenes.ts";
import styles from "./Scene.module.css";

// Clickable scene: the background covers the frame, each object is one action,
// each character opens a dialogue. Everything is placed in % of the image (see
// sceneLayout in packages/shared), so it follows the cropping. What it shows as
// it is played is playScene's, shared with the mobile app.

export const Scene = ({ data, images }: { data: SceneData; images: SceneImages }) => {
  const { scene } = data;
  const layout = sceneLayout(data);
  const [{ narration, conversation }, dispatch] = useReducer(playScene, data, initialSceneState);

  // The text can be folded to see the whole image; a new text opens it again.
  const [foldedAt, setFoldedAt] = useState<number>();
  const folded = foldedAt === narration.key;

  // ── Dialogue: an open conversation, until it is left ─────────────────────────

  const returnFocus = useRef<HTMLButtonElement>(null);
  const choicesRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);

  const open = (character: Character, from: HTMLButtonElement) => {
    returnFocus.current = from;
    dispatch({ type: "talk", character });
  };
  const close = () => {
    dispatch({ type: "leave" });
    returnFocus.current?.focus();
  };

  useEffect(() => {
    if (conversation === undefined) return;
    choicesRef.current?.querySelector("button")?.focus();
    linesRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [conversation]);

  // Escape leaves the conversation.
  const inConversation = conversation !== undefined;
  useEffect(() => {
    if (!inConversation) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dispatch({ type: "leave" });
      returnFocus.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inConversation]);

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
    revealTimer.current = setTimeout(() => el.removeAttribute("data-revealed"), REVEAL_MS);
  };
  useEffect(() => () => clearTimeout(revealTimer.current), []);

  return (
    <div
      className={styles.root}
      data-orientation={layout.landscape ? "landscape" : "portrait"}
      data-folded={folded || undefined}
    >
      <div
        className={styles.scene}
        style={{ "--image-ratio": layout.ratio, "--reveal": `${REVEAL_MS}ms` } as CSSProperties}
      >
        <img className={styles.background} src={images.background.src} alt="" />
        <div ref={layer} className={styles.layer}>
          {layout.objects.map(({ object, box }) => (
            <button
              key={object.id}
              type="button"
              className={styles.hotspot}
              aria-label={object.label}
              style={placeStyle(box)}
              onClick={() => dispatch({ type: "look", title: object.label, text: object.text })}
            >
              <span className={styles.tip}>{object.label}</span>
            </button>
          ))}

          {/* Characters: layers placed by their feet. */}
          {layout.characters.map(({ character, box }) => {
            const label = sceneText.talkTo(character.name);
            return (
              <button
                key={character.id}
                type="button"
                className={styles.character}
                aria-label={label}
                style={placeStyle(box)}
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
          aria-label={sceneText.reveal}
          onClick={reveal}
        >
          ✦
        </button>
      </header>

      <section
        key={narration.key}
        id="narration"
        className={`${styles.narration} ${styles.appear}`}
        aria-live="polite"
      >
        <h2>{narration.title}</h2>
        <p>{narration.text}</p>
      </section>

      <button
        type="button"
        className={styles.fold}
        aria-controls="narration"
        aria-expanded={!folded}
        aria-label={folded ? sceneText.unfoldText : sceneText.foldText}
        onClick={() => setFoldedAt(folded ? undefined : narration.key)}
      >
        <span aria-hidden="true">{folded ? "‹" : "›"}</span>
      </button>

      {/* Over everything when the screen is not turned like the scene (see the CSS). */}
      <div className={styles.turn}>
        <span className={styles.turnIcon} aria-hidden="true">
          ⟳
        </span>
        <p>{layout.landscape ? sceneText.turnLandscape : sceneText.turnPortrait}</p>
      </div>

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
              {remainingTopics(conversation).map((topic) => (
                <button
                  key={topic.ask}
                  type="button"
                  onClick={() => dispatch({ type: "ask", topic })}
                >
                  {topic.ask}
                </button>
              ))}
              <button type="button" onClick={close}>
                {sceneText.goodbye}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

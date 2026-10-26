"use client";

import {
  type Character,
  INTRO,
  initialSceneState,
  introHold,
  placeStyle,
  playScene,
  remainingTopics,
  type SceneData,
  sceneLayout,
  sceneText,
} from "@esquisse/shared";
import {
  type CSSProperties,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { SceneImages } from "../scenes.ts";
import { Drawer } from "./Drawer.tsx";
import styles from "./Scene.module.css";

type DrawerTabId = "narration" | "two" | "three";

// Clickable scene: the background covers the frame, each object is one action,
// each character opens a dialogue. Everything is placed in % of the image (see
// sceneLayout in packages/shared), so it follows the cropping. What it shows as
// it is played is playScene's, shared with the mobile app.

// A touch screen held the other way than the scene, which then asks to turn it
// (see .turn in the CSS). A computer's frame is already turned like the scene.
const COARSE = "(pointer: coarse)";
const PORTRAIT = "(orientation: portrait)";
const onScreenChange = (onChange: () => void) => {
  const lists = [COARSE, PORTRAIT].map((q) => window.matchMedia(q));
  for (const list of lists) list.addEventListener("change", onChange);
  return () => {
    for (const list of lists) list.removeEventListener("change", onChange);
  };
};
const useNotTurned = (landscape: boolean) =>
  useSyncExternalStore(
    onScreenChange,
    () => window.matchMedia(COARSE).matches && window.matchMedia(PORTRAIT).matches === landscape,
    () => false,
  );

export const Scene = ({ data, images }: { data: SceneData; images: SceneImages }) => {
  const { scene } = data;
  const layout = sceneLayout(data);
  const [{ narration, conversation }, dispatch] = useReducer(playScene, data, initialSceneState);

  // The drawer shows the text, or another content (2 and 3, to come); it can be
  // folded to see the whole image. A new text opens it again, on the text. It
  // starts folded: the scene's intro waits for its button.
  const [choice, setChoice] = useState<{ tab: DrawerTabId | undefined; at: number }>({
    tab: undefined,
    at: narration.key,
  });
  const drawerTab = choice.at === narration.key ? choice.tab : "narration";

  // The title on black, then the intro under it, until they have faded out
  // (see the CSS). It waits for the screen to be turned like the scene, and
  // starts over if it is turned away before the end: it is never missed.
  const [intro, setIntro] = useState(true);
  const notTurned = useNotTurned(layout.landscape);

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

  return (
    <div className={styles.root} data-orientation={layout.landscape ? "landscape" : "portrait"}>
      <div className={styles.scene} style={{ "--image-ratio": layout.ratio } as CSSProperties}>
        <img className={styles.background} src={images.background.src} alt="" />
        <div className={styles.layer}>
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

      <Drawer
        id="drawer"
        side={layout.landscape ? "right" : "bottom"}
        size={layout.landscape ? "var(--panel)" : "var(--band)"}
        open={drawerTab}
        onOpen={(tab) => setChoice({ tab, at: narration.key })}
        tabs={[
          {
            id: "narration",
            icon: "1",
            label: drawerTab === "narration" ? sceneText.foldText : sceneText.unfoldText,
            content: (
              <section
                key={narration.key}
                className={`${styles.narration} ${styles.appear}`}
                aria-live="polite"
              >
                <h2>{narration.title}</h2>
                <p>{narration.text}</p>
              </section>
            ),
          },
          {
            id: "two",
            icon: "2",
            label: "2",
            content: (
              <section className={`${styles.narration} ${styles.appear}`}>
                <p>2</p>
              </section>
            ),
          },
          {
            id: "three",
            icon: "3",
            label: "3",
            content: (
              <section className={`${styles.narration} ${styles.appear}`}>
                <p>3</p>
              </section>
            ),
          },
        ]}
      />

      {intro && !notTurned && (
        <div
          className={styles.intro}
          style={
            {
              "--intro-hold": `${introHold(scene)}ms`,
              "--intro-text-delay": `${INTRO.textDelay}ms`,
              "--intro-text-fade": `${INTRO.textFade}ms`,
              "--intro-fade": `${INTRO.fade}ms`,
            } as CSSProperties
          }
          // Its own fade out, not the intro text's fade in.
          onAnimationEnd={(event) => event.target === event.currentTarget && setIntro(false)}
        >
          <h1>{scene.title}</h1>
          <p>{scene.intro}</p>
        </div>
      )}

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

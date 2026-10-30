"use client";

import {
  type Character,
  CONTAINER_SLOTS,
  ENTER_ARROW,
  INTRO,
  INTRO_HOLD,
  INVENTORY_SLOTS,
  initialSceneState,
  itemName,
  type ObjectAction,
  objectAction,
  objectActions,
  objectMenuPlace,
  placeStyle,
  playScene,
  RING_ITEMS,
  remainingTopics,
  type SceneData,
  type SceneObject,
  sceneLayout,
  sceneText,
} from "@esquisse/shared";
import shovel from "@esquisse/shared/assets/items/pelle.webp";
import satchel from "@esquisse/shared/assets/ui/besace.webp";
import {
  type CSSProperties,
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { SceneImages } from "../scenes.ts";
import { Drawer } from "./Drawer.tsx";
import { Effects } from "./Effects.tsx";
import { RingMenu } from "./RingMenu.tsx";
import styles from "./Scene.module.css";

type DrawerTabId = "inventory";

// The items' images, by id (see ITEMS in packages/shared).
const ITEM_IMAGES: Record<string, string> = { pelle: shovel.src };

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
  const [{ conversation, inventory, contents, searching }, dispatch] = useReducer(
    playScene,
    data,
    initialSceneState,
  );

  // The drawer shows the inventory, opened by the ring menu's satchel; it can be
  // folded to see the whole image. It starts folded.
  const [drawerTab, setDrawerTab] = useState<DrawerTabId | undefined>(undefined);

  // The title on black, then the intro under it, then the button to enter,
  // until it is pressed and they have faded out (see Intro). It waits for the
  // screen to be turned like the scene, and starts over if it is turned away
  // before the end: it is never missed.
  const [intro, setIntro] = useState(true);
  const notTurned = useNotTurned(layout.landscape);

  // ── An object's menu: its actions, where it was clicked ──────────────────────

  const rootRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ object: SceneObject; x: number; y: number }>();
  const menuFrom = useRef<HTMLButtonElement>(null);

  const openMenu = (object: SceneObject, event: MouseEvent<HTMLButtonElement>) => {
    const root = rootRef.current?.getBoundingClientRect();
    if (root === undefined) return;
    // From the keyboard, there is no pointer: the middle of the object.
    const from = event.currentTarget.getBoundingClientRect();
    const keyboard = event.detail === 0;
    menuFrom.current = event.currentTarget;
    setMenu({
      object,
      x: (keyboard ? from.left + from.width / 2 : event.clientX) - root.left,
      y: (keyboard ? from.top + from.height / 2 : event.clientY) - root.top,
    });
  };
  const closeMenu = () => {
    setMenu(undefined);
    menuFrom.current?.focus();
  };

  // Escape closes the menu.
  const menuOpen = menu !== undefined;
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenu(undefined);
      menuFrom.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

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

  // ── Searching: what an object holds, until it is closed ──────────────────────

  const contentsRef = useRef<HTMLDivElement>(null);
  const stopSearching = () => {
    dispatch({ type: "stopSearching" });
    menuFrom.current?.focus();
  };

  // Escape closes it.
  const isSearching = searching !== undefined;
  useEffect(() => {
    if (!isSearching) return;
    contentsRef.current?.querySelector("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dispatch({ type: "stopSearching" });
      menuFrom.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSearching]);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-orientation={layout.landscape ? "landscape" : "portrait"}
    >
      <div className={styles.scene} style={{ "--image-ratio": layout.ratio } as CSSProperties}>
        <img className={styles.background} src={images.background.src} alt="" />
        {scene.effects && (
          <Effects effects={scene.effects} background={images.background} files={images.effects} />
        )}
        <div className={styles.layer}>
          {layout.objects.map(({ object, box }) => (
            <button
              key={object.id}
              type="button"
              className={styles.hotspot}
              aria-label={object.label}
              aria-haspopup="menu"
              aria-expanded={menu?.object === object}
              data-open={menu?.object === object || undefined}
              style={placeStyle(box)}
              onClick={(event) => openMenu(object, event)}
            />
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

      <Drawer<DrawerTabId>
        id="drawer"
        side={layout.landscape ? "right" : "bottom"}
        size={layout.landscape ? "var(--panel)" : "var(--band)"}
        // The ring menu takes their place (see below).
        hideButtons
        open={drawerTab}
        onOpen={setDrawerTab}
        tabs={[
          {
            id: "inventory",
            image: satchel.src,
            label: sceneText.inventory,
            content: (
              <section className={`${styles.inventory} ${styles.appear}`}>
                <h2>{sceneText.inventory}</h2>
                <ul>
                  {INVENTORY_SLOTS.map((slot, i) => {
                    const item = inventory[i];
                    return item === undefined ? (
                      <li key={slot} aria-label={sceneText.emptySlot} />
                    ) : (
                      <li key={slot} aria-label={itemName(item)}>
                        <img src={ITEM_IMAGES[item]} alt="" draggable={false} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ),
          },
        ]}
      />

      {/* The ring menu, in the bottom right corner: pressing it folds the
          drawer, its satchel opens the inventory; what its other items do is
          to come. */}
      <RingMenu
        items={[
          { id: "inventory", label: sceneText.inventory, image: satchel.src },
          ...RING_ITEMS.map((item) => ({ id: item, label: item })),
        ]}
        onChoose={(item) => {
          if (item === "inventory") setDrawerTab("inventory");
        }}
      />

      {menu && (
        <ObjectMenu
          object={menu.object}
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
          onAction={(action) => {
            dispatch(objectAction(menu.object, action));
            closeMenu();
          }}
        />
      )}

      {intro && !notTurned && <Intro scene={scene} onEnd={() => setIntro(false)} />}

      {/* Over everything when the screen is not turned like the scene (see the CSS). */}
      <div className={styles.turn}>
        <span className={styles.turnIcon} aria-hidden="true">
          ⟳
        </span>
        <p>{layout.landscape ? sceneText.turnLandscape : sceneText.turnPortrait}</p>
      </div>

      {/* What the object searched holds, in a window in the middle of the
          frame: a press on an item puts it in the inventory. */}
      {searching && (
        // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: Escape closes it too
        <div
          className={styles.backdrop}
          onClick={(event) => {
            if (event.target === event.currentTarget) stopSearching();
          }}
        >
          <div
            ref={contentsRef}
            className={styles.contents}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contents-name"
          >
            <h2 id="contents-name">{searching.label}</h2>
            <ul className={styles.slots}>
              {CONTAINER_SLOTS.map((slot, i) => {
                const item = contents[searching.id]?.[i];
                return item === undefined ? (
                  <li key={slot} aria-label={sceneText.emptySlot} />
                ) : (
                  <li key={slot}>
                    <button
                      type="button"
                      className={styles.take}
                      aria-label={sceneText.take(itemName(item))}
                      onClick={() => dispatch({ type: "take", item })}
                    >
                      <img src={ITEM_IMAGES[item]} alt="" draggable={false} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className={styles.choices}>
              <button type="button" onClick={stopSearching}>
                {sceneText.close}
              </button>
            </div>
          </div>
        </div>
      )}

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

// An object's actions, in a menu to the right of where it was clicked, or to
// its left (see objectMenuPlace).
// A click out of it, or Escape, closes it.
const ObjectMenu = ({
  object,
  x,
  y,
  onClose,
  onAction,
}: {
  object: SceneObject;
  x: number;
  y: number;
  onClose(): void;
  onAction(action: ObjectAction): void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number }>();

  useLayoutEffect(() => {
    const menu = ref.current;
    const frame = menu?.parentElement;
    if (!menu || !frame) return;
    setPlace(
      objectMenuPlace(
        { x, y },
        { width: menu.offsetWidth, height: menu.offsetHeight },
        { width: frame.clientWidth, height: frame.clientHeight },
      ),
    );
  }, [x, y]);
  // Once placed (hidden until then, it could not take the focus).
  useEffect(() => {
    if (place) ref.current?.querySelector("button")?.focus();
  }, [place]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: Escape closes it too
    <div
      className={styles.menuBackdrop}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="menu"
        aria-label={sceneText.actionsOf(object.label)}
        className={styles.menu}
        style={place ?? { left: x, top: y, visibility: "hidden" }}
      >
        {objectActions(object).map((action) => (
          <button key={action.label} type="button" role="menuitem" onClick={() => onAction(action)}>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// The scene's opening: its title on black, then its intro fading in under it;
// shortly after it has appeared, an arrow to enter fades in, in the bottom right
// corner of the frame, and the scene waits for it. Pressed, everything fades out to
// show the scene (see the CSS).
const Intro = ({ scene, onEnd }: { scene: SceneData["scene"]; onEnd(): void }) => {
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const enter = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), INTRO_HOLD);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (ready) enter.current?.focus();
  }, [ready]);

  return (
    <div
      className={styles.intro}
      data-ready={ready || undefined}
      data-leaving={leaving || undefined}
      style={
        {
          "--intro-text-delay": `${INTRO.textDelay}ms`,
          "--intro-text-fade": `${INTRO.textFade}ms`,
          "--intro-button-fade": `${INTRO.buttonFade}ms`,
          "--intro-fade": `${INTRO.fade}ms`,
        } as CSSProperties
      }
      // Its own fade out, not the fade in of what is in it.
      onAnimationEnd={(event) => leaving && event.target === event.currentTarget && onEnd()}
    >
      <h1>{scene.title}</h1>
      <p>{scene.intro}</p>
      <button
        ref={enter}
        type="button"
        className={styles.enter}
        aria-label={sceneText.enter}
        disabled={leaving}
        onClick={() => setLeaving(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d={ENTER_ARROW} />
        </svg>
      </button>
    </div>
  );
};

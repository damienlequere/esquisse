"use client";

import {
  type Character,
  CONTAINER_COLUMNS,
  CONTAINER_SLOTS,
  ENTER_ARROW,
  INTRO,
  INTRO_HOLD,
  INVENTORY_COLUMNS,
  INVENTORY_SLOTS,
  initialSceneState,
  itemName,
  type ObjectAction,
  objectAction,
  objectActions,
  objectMenuPlace,
  placeStyle,
  playScene,
  remainingTopics,
  type SceneData,
  type SceneObject,
  savedGame,
  saveKey,
  sceneLayout,
  sceneText,
} from "@esquisse/shared";
import shovel from "@esquisse/shared/assets/items/pelle.webp";
import satchel from "@esquisse/shared/assets/ui/besace.webp";
import logbook from "@esquisse/shared/assets/ui/journal.webp";
import cogwheel from "@esquisse/shared/assets/ui/roue.webp";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { SceneImages } from "../scenes.ts";
import { Effects } from "./Effects.tsx";
import { RingMenu } from "./RingMenu.tsx";
import styles from "./Scene.module.css";
import { Toast } from "./Toast.tsx";

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

export const Scene = ({
  id,
  data,
  images,
}: {
  id: string;
  data: SceneData;
  images: SceneImages;
}) => {
  const { scene } = data;
  const layout = sceneLayout(data);
  const [state, dispatch] = useReducer(playScene, data, initialSceneState);
  const { conversation, inventory, contents, searching, toast } = state;

  // ── The game: saved on the device, resumed where it was ──────────────────────

  const router = useRouter();
  useEffect(() => {
    try {
      const saved = localStorage.getItem(saveKey(id));
      if (saved !== null) dispatch({ type: "restore", saved: JSON.parse(saved) });
    } catch {
      // Nothing saved that can be read: the scene starts as it is.
    }
  }, [id]);
  const save = () => {
    try {
      localStorage.setItem(saveKey(id), JSON.stringify(savedGame(state)));
      dispatch({ type: "saved" });
    } catch {
      // Storage blocked or full: no toast, as nothing was saved.
    }
  };

  // The general menu's window, opened by the ring menu's cogwheel.
  const [gameMenuOpen, setGameMenuOpen] = useState(false);

  // The inventory's window, opened by the ring menu's satchel.
  const [inventoryOpen, setInventoryOpen] = useState(false);

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

      {/* The ring menu, in the bottom right corner: its satchel opens the
          inventory, its cogwheel the general menu; what its logbook does is to
          come. */}
      <RingMenu
        items={[
          { id: "inventory", label: sceneText.inventory, image: satchel.src },
          { id: "logbook", label: sceneText.logbook, image: logbook.src },
          { id: "gameMenu", label: sceneText.gameMenu, image: cogwheel.src },
        ]}
        onChoose={(item) => {
          if (item === "inventory") setInventoryOpen(true);
          if (item === "gameMenu") setGameMenuOpen(true);
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

      {/* The inventory, opened by the ring menu's satchel: the items carried. */}
      {inventoryOpen && (
        <SlotsWindow
          label={sceneText.inventory}
          titled
          columns={INVENTORY_COLUMNS}
          onClose={() => setInventoryOpen(false)}
        >
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
        </SlotsWindow>
      )}

      {/* The general menu, opened by the ring menu's cogwheel: save the game
          (it closes, a toast says so), or leave the scene for the home page. */}
      {gameMenuOpen && (
        <Window label={sceneText.gameMenu} onClose={() => setGameMenuOpen(false)}>
          <div className={`${styles.choices} ${styles.gameMenu}`}>
            <button
              type="button"
              onClick={() => {
                save();
                setGameMenuOpen(false);
              }}
            >
              {sceneText.save}
            </button>
            <button type="button" onClick={() => router.push("/")}>
              {sceneText.quit}
            </button>
          </div>
        </Window>
      )}

      {/* What the object searched holds: a press on an item puts it in the
          inventory. */}
      {searching && (
        <SlotsWindow
          label={searching.label}
          columns={CONTAINER_COLUMNS}
          onClose={() => dispatch({ type: "stopSearching" })}
        >
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
        </SlotsWindow>
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

      {/* What was just done, as taking an item: over the rest. */}
      <Toast message={toast} />
    </div>
  );
};

// A window in the middle of the frame, over the darkened scene, in both
// orientations, showing `children`; `titled`, its label above them, otherwise
// only for screen readers. A press out of it, or Escape, closes it. It takes
// the focus, on its first button or on itself, and gives it back to what had it.
const Window = ({
  label,
  titled,
  onClose,
  children,
}: {
  label: string;
  titled?: boolean;
  onClose(): void;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const title = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const from = document.activeElement;
    const own = ref.current;
    (own?.querySelector("button") ?? own)?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (from instanceof HTMLElement) from.focus();
    };
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: Escape closes it too
    <div
      className={styles.backdrop}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={ref}
        className={styles.window}
        role="dialog"
        aria-modal="true"
        aria-label={titled ? undefined : label}
        aria-labelledby={titled ? title : undefined}
        tabIndex={-1}
      >
        {titled && <h2 id={title}>{label}</h2>}
        {children}
      </div>
    </div>
  );
};

// A window of slots, rounded squares, `columns` to a row: the inventory, or what
// an object searched holds (`children`, its <li>).
const SlotsWindow = ({
  columns,
  children,
  ...window
}: {
  label: string;
  titled?: boolean;
  columns: number;
  onClose(): void;
  children: ReactNode;
}) => (
  <Window {...window}>
    <ul className={styles.slots} style={{ "--columns": columns } as CSSProperties}>
      {children}
    </ul>
  </Window>
);

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

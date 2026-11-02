"use client";

import {
  BACK_ARROW,
  type Character,
  CONTAINER_COLUMNS,
  CONTAINER_SLOTS,
  ENTER_ARROW,
  type GameAction,
  type GameState,
  heldBy,
  INTRO,
  INTRO_HOLD,
  INVENTORY_COLUMNS,
  INVENTORY_SLOTS,
  type Items,
  itemName,
  type ObjectAction,
  objectActions,
  objectMenuPlace,
  placeStyle,
  RING_ICONS,
  remainingTopics,
  ringSizes,
  type SceneData,
  type SceneObject,
  sceneLayout,
  sceneText,
} from "@esquisse/engine";
import type { StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { SceneImages } from "../images.ts";
import { Effects } from "./Effects.tsx";
import { RingMenu } from "./RingMenu.tsx";
import styles from "./Scene.module.css";
import { Toast } from "./Toast.tsx";

// Clickable scene: the background covers the frame, each object is one action,
// each character opens a dialogue. Everything is placed in % of the image (see
// sceneLayout in packages/engine), so it follows the cropping. What it shows as
// it is played is the game's (see Game), as playGame plays it, shared with the
// mobile app.

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
  data,
  images,
  state,
  dispatch,
  onBack,
  items,
  itemImages,
}: {
  data: SceneData;
  images: SceneImages;
  // The game's items, and their images, by id.
  items: Items;
  itemImages: Record<string, StaticImageData>;
  state: GameState;
  dispatch(action: GameAction): void;
  // Leaves the scene by its back exit, where the game links it.
  onBack?(): void;
}) => {
  const { scene } = data;
  const layout = sceneLayout(data);
  const { conversation, inventory, flags, searching, toast, logbook } = state;
  const router = useRouter();

  // The general menu's window, opened by the ring menu's cogwheel.
  const [gameMenuOpen, setGameMenuOpen] = useState(false);

  // The inventory's window, opened by the ring menu's pouch.
  const [inventoryOpen, setInventoryOpen] = useState(false);

  // The logbook's window, opened by the ring menu's book.
  const [logbookOpen, setLogbookOpen] = useState(false);

  // The title on black, then the intro under it, then the button to enter,
  // until it is pressed and they have faded out (see Intro), on the scene's
  // first visit. It waits for the screen to be turned like the scene, and
  // starts over if it is turned away before the end: it is never missed.
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
          {layout.objects.map(
            ({ object, box }) =>
              objectActions(object, flags).length > 0 && (
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
              ),
          )}

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

      {/* The back button, in the bottom left corner, where the scene has a
          way back. */}
      {onBack && <BackButton onPress={onBack} />}

      {/* The ring menu, in the bottom right corner: its pouch opens the
          inventory, its book the logbook, its cogwheel the general menu. */}
      <RingMenu
        items={[
          { id: "inventory", label: sceneText.inventory, icon: RING_ICONS.inventory },
          { id: "logbook", label: sceneText.logbook, icon: RING_ICONS.logbook },
          { id: "gameMenu", label: sceneText.gameMenu, icon: RING_ICONS.gameMenu },
        ]}
        onChoose={(item) => {
          if (item === "inventory") setInventoryOpen(true);
          if (item === "logbook") setLogbookOpen(true);
          if (item === "gameMenu") setGameMenuOpen(true);
        }}
      />

      {menu && (
        <ObjectMenu
          object={menu.object}
          actions={objectActions(menu.object, flags)}
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
          onAction={(action) => {
            dispatch({ type: "use", object: menu.object, action });
            closeMenu();
          }}
        />
      )}

      {state.intro && !notTurned && (
        <Intro scene={scene} onEnd={() => dispatch({ type: "endIntro" })} />
      )}

      {/* Over everything when the screen is not turned like the scene (see the CSS). */}
      <div className={styles.turn}>
        <span className={styles.turnIcon} aria-hidden="true">
          ⟳
        </span>
        <p>{layout.landscape ? sceneText.turnLandscape : sceneText.turnPortrait}</p>
      </div>

      {/* The inventory, opened by the ring menu's pouch: the items carried. */}
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
              <li key={slot} aria-label={itemName(items, item)}>
                <img src={itemImages[item]?.src} alt="" draggable={false} />
              </li>
            );
          })}
        </SlotsWindow>
      )}

      {/* The logbook, opened by the ring menu's book: its entries, oldest
          first, the scene's intro the first. */}
      {logbookOpen && (
        <Window label={sceneText.logbook} titled onClose={() => setLogbookOpen(false)}>
          <div className={styles.logbook}>
            {logbook.map((entry, i) => (
              <p key={i} className={styles.entry}>
                {entry}
              </p>
            ))}
          </div>
        </Window>
      )}

      {/* The general menu, opened by the ring menu's cogwheel: save the game
          (to come: it does nothing yet), or leave the scene for the home page. */}
      {gameMenuOpen && (
        <Window label={sceneText.gameMenu} onClose={() => setGameMenuOpen(false)}>
          <div className={`${styles.choices} ${styles.gameMenu}`}>
            <button type="button">{sceneText.save}</button>
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
            const item = heldBy(state, searching)[i];
            return item === undefined ? (
              <li key={slot} aria-label={sceneText.emptySlot} />
            ) : (
              <li key={slot}>
                <button
                  type="button"
                  className={styles.take}
                  aria-label={sceneText.take(itemName(items, item))}
                  onClick={() => dispatch({ type: "take", item })}
                >
                  <img src={itemImages[item]?.src} alt="" draggable={false} />
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

// The back button: the ring menu's circle's size (ringSizes, from the frame's),
// its arrow drawn as the circle is, half seen at rest. The mobile app has the
// same.
const BackButton = ({ onPress }: { onPress(): void }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [frame, setFrame] = useState({ width: 400, height: 400 });
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const measure = () => setFrame({ width: parent.clientWidth, height: parent.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  const size = ringSizes(frame.width, frame.height).size;
  return (
    <button
      ref={ref}
      type="button"
      className={styles.back}
      aria-label={sceneText.back}
      style={{ width: size, height: size }}
      onClick={onPress}
    >
      <svg className={styles.backArrow} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={BACK_ARROW} />
      </svg>
    </button>
  );
};

// An object's actions, in a menu to the right of where it was clicked, or to
// its left (see objectMenuPlace).
// A click out of it, or Escape, closes it.
const ObjectMenu = ({
  object,
  actions,
  x,
  y,
  onClose,
  onAction,
}: {
  object: SceneObject;
  actions: ObjectAction[];
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
        {actions.map((action) => (
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

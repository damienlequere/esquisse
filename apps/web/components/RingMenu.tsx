import { ringItemAt, ringItemOffset, ringSizes, sceneText } from "@esquisse/shared";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import styles from "./RingMenu.module.css";

// How long the chosen item stays, lit, before the menu folds.
const CHOSEN = 220;

// The window's shorter side, which the ring menu's sizes follow (ringSizes);
// a phone's before it is known.
const onResize = (change: () => void) => {
  window.addEventListener("resize", change);
  return () => window.removeEventListener("resize", change);
};
const shorterSide = () => Math.min(window.innerWidth, window.innerHeight);

// One of its items: a circle showing `label`; with `icon`, that stroke instead,
// drawn as the arrow to enter is (a path in a 24 × 24 viewBox).
export type RingItem<Id extends string> = { id: Id; label: string; icon?: string };

// A circle in the bottom right corner of its parent: held, it spreads `items`
// in a quarter of a circle around it, from its left to above it, and the one
// under the pointer when it is let go is chosen (ringItemAt in packages/shared);
// let go anywhere else, it folds. From the keyboard, Enter opens it, the arrows
// go from one item to the next, Enter chooses, Escape folds it.
// Its sizes follow the window's (ringSizes).
// The mobile app has the same (apps/mobile/src/components/RingMenu.tsx).
export const RingMenu = <Id extends string>({
  items,
  onChoose,
}: {
  items: RingItem<Id>[];
  onChoose(item: Id): void;
}) => {
  const side = useSyncExternalStore(onResize, shorterSide, () => 400);
  const ring = ringSizes(side, side);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number>();
  const [chosen, setChosen] = useState<number>();
  const circle = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  // Opened from the keyboard: its items take the focus.
  const [keyboard, setKeyboard] = useState(false);

  const at = (event: PointerEvent) => {
    const box = event.currentTarget.getBoundingClientRect();
    return ringItemAt(
      {
        x: event.clientX - (box.left + box.width / 2),
        y: event.clientY - (box.top + box.height / 2),
      },
      items.length,
      ring,
    );
  };
  const fold = () => {
    setOpen(false);
    setHovered(undefined);
    setKeyboard(false);
  };
  const choose = (index: number) => {
    setChosen(index);
    const item = items[index];
    if (item) onChoose(item.id);
  };

  // The chosen item stays a moment, then the menu folds.
  useEffect(() => {
    if (chosen === undefined) return;
    const timer = setTimeout(() => {
      setChosen(undefined);
      fold();
      circle.current?.focus();
    }, CHOSEN);
    return () => clearTimeout(timer);
  }, [chosen]);

  useEffect(() => {
    if (open && keyboard) list.current?.querySelector("button")?.focus();
  }, [open, keyboard]);

  const onItemKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key];
    if (step !== undefined) {
      event.preventDefault();
      const next = (index + step + items.length) % items.length;
      (list.current?.children[next] as HTMLElement | undefined)?.focus();
    } else if (event.key === "Escape") {
      fold();
      circle.current?.focus();
    }
  };

  const style = {
    "--ring-size": `${ring.size}px`,
    "--ring-item": `${ring.item}px`,
  } as CSSProperties;
  return (
    <div className={styles.ring} style={style} data-open={open || undefined}>
      <div ref={list} role="menu" aria-label={sceneText.ringMenu} className={styles.items}>
        {items.map((item, i) => {
          const { x, y } = ringItemOffset(i, items.length, ring);
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              aria-label={item.icon ? item.label : undefined}
              tabIndex={open && keyboard ? 0 : -1}
              className={styles.item}
              data-hovered={hovered === i || undefined}
              data-chosen={chosen === i || undefined}
              style={{ "--x": `${x}px`, "--y": `${y}px`, "--i": i } as CSSProperties}
              onClick={() => chosen === undefined && choose(i)}
              onKeyDown={(event) => onItemKey(event, i)}
            >
              {item.icon ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d={item.icon} />
                </svg>
              ) : (
                item.label
              )}
            </button>
          );
        })}
      </div>
      <button
        ref={circle}
        type="button"
        className={styles.circle}
        aria-label={sceneText.ringMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        onPointerDown={(event) => {
          if (event.button !== 0 || chosen !== undefined) return;
          // Its moves and its release come here, wherever the pointer goes.
          event.currentTarget.setPointerCapture(event.pointerId);
          setKeyboard(false);
          setOpen(true);
        }}
        onPointerMove={(event) => open && !keyboard && setHovered(at(event))}
        onPointerUp={(event) => {
          if (!open || keyboard || chosen !== undefined) return;
          const index = at(event);
          if (index === undefined) fold();
          else choose(index);
        }}
        onPointerCancel={() => !keyboard && fold()}
        // Only from the keyboard: a pointer opens it by holding it.
        onClick={(event) => {
          if (event.detail !== 0) return;
          if (open) fold();
          else {
            setKeyboard(true);
            setOpen(true);
          }
        }}
        onKeyDown={(event) => event.key === "Escape" && fold()}
      />
    </div>
  );
};

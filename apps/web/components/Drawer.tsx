import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./Drawer.module.css";

// One of the drawer's contents: its round button shows `icon`, named `label`.
export type DrawerTab<Id extends string> = {
  id: Id;
  icon: ReactNode;
  label: string;
  content: ReactNode;
};

// A panel over its parent, against its bottom or right edge, showing one of
// several contents, each opened by its round button. The buttons stand toward
// the bottom right corner, just out of the panel: in a row above it, or in a
// column on its left; folded, it slides out and they slide with it to the edge.
// The open content's button folds it away, to see what is under it, and so
// does a click anywhere else, which still reaches what it is on.
// Its parent is positioned; `size` is any CSS length, its height at the bottom
// or its width on the right (in cqh or cqw when the parent is a size container).
// The mobile app has the same (apps/mobile/src/components/Drawer.tsx).
export const Drawer = <Id extends string>({
  id,
  side,
  size,
  tabs,
  open,
  onOpen,
}: {
  id: string;
  side: "bottom" | "right";
  size: string;
  tabs: DrawerTab<Id>[];
  // The open content, none when folded.
  open: Id | undefined;
  onOpen(tab: Id | undefined): void;
}) => {
  // Folding, it keeps its content while it slides out.
  const [last, setLast] = useState(open);
  if (open !== undefined && open !== last) setLast(open);
  const shown = tabs.find((tab) => tab.id === (open ?? last));

  const panel = useRef<HTMLDivElement>(null);
  const buttons = useRef<HTMLDivElement>(null);
  const isOpen = open !== undefined;
  const fold = useRef(onOpen);
  fold.current = onOpen;
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || buttons.current?.contains(target)) return;
      fold.current(undefined);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [isOpen]);
  const style = { "--drawer-size": size } as CSSProperties;
  const state = { "data-side": side, "data-open": isOpen || undefined };
  return (
    <>
      <div ref={panel} id={id} className={styles.panel} style={style} {...state}>
        {shown?.content}
      </div>
      <div ref={buttons} className={styles.buttons} style={style} {...state}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-controls={id}
            aria-expanded={tab.id === open}
            aria-label={tab.label}
            onClick={() => onOpen(tab.id === open ? undefined : tab.id)}
          >
            {tab.icon}
          </button>
        ))}
      </div>
    </>
  );
};

import { TOAST } from "@esquisse/shared";
import { type CSSProperties, useEffect, useState } from "react";
import styles from "./Toast.module.css";

export type ToastMessage = { text: string; key: number };

// Short messages at the bottom of their parent, which is positioned: each one
// slides in, stays, and fades out by itself (TOAST in packages/shared). A new
// message, with a new key, goes under those still shown, which it pushes up.
// Screen readers hear it. The mobile app has the same
// (apps/mobile/src/components/Toast.tsx).
export const Toast = ({ message }: { message: ToastMessage | undefined }) => {
  const [shown, setShown] = useState<ToastMessage[]>([]);
  useEffect(() => {
    if (message === undefined) return;
    setShown((all) => (all.some(({ key }) => key === message.key) ? all : [...all, message]));
  }, [message]);
  return (
    <div
      role="status"
      className={styles.region}
      style={{ "--toast-duration": `${TOAST.duration}ms` } as CSSProperties}
    >
      {shown.map(({ text, key }) => (
        <p
          key={key}
          className={styles.toast}
          onAnimationEnd={() => setShown((all) => all.filter((m) => m.key !== key))}
        >
          {text}
        </p>
      ))}
    </div>
  );
};

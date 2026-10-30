import { TOAST } from "@esquisse/shared";
import { type CSSProperties, useEffect, useState } from "react";
import styles from "./Toast.module.css";

export type ToastMessage = { text: string; key: number };

// A short message at the bottom of its parent, which is positioned: it slides in,
// stays, and fades out by itself (TOAST in packages/shared). A new message, with
// a new key, replaces it and shows again. Screen readers hear it. The mobile
// app has the same (apps/mobile/src/components/Toast.tsx).
export const Toast = ({ message }: { message: ToastMessage | undefined }) => {
  const [shown, setShown] = useState(message);
  useEffect(() => setShown(message), [message]);
  return (
    <div
      role="status"
      className={styles.region}
      style={{ "--toast-duration": `${TOAST.duration}ms` } as CSSProperties}
    >
      {shown && (
        <p key={shown.key} className={styles.toast} onAnimationEnd={() => setShown(undefined)}>
          {shown.text}
        </p>
      )}
    </div>
  );
};

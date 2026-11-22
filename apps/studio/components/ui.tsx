"use client";

// The studio's small pieces: buttons, fields, a window over the page. Neutral,
// bare: a window closes with a press outside or Escape.

import { type ButtonHTMLAttributes, type ReactNode, useEffect, useId, useRef } from "react";

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

export const Button = ({
  variant = "default",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger";
}) => (
  <button
    type="button"
    {...props}
    className={cx(
      "inline-flex items-center justify-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition",
      variant === "default" && "border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
      variant === "primary" && "bg-zinc-100 text-zinc-900 hover:bg-white",
      variant === "ghost" && "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
      variant === "danger" && "border border-red-900 text-red-300 hover:bg-red-950",
      className,
    )}
  />
);

// A label over its field, which it names.
export const Field = ({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
  className?: string;
}) => {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-xs font-medium text-zinc-400">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
};

// A text field that grows with its text.
export const TextArea = ({
  value,
  onChange,
  rows = 2,
  ...props
}: {
  id?: string;
  value: string;
  onChange(value: string): void;
  rows?: number;
  placeholder?: string;
  readOnly?: boolean;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      {...props}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none"
    />
  );
};

// A window over the page, in its middle; a press around it or Escape closes it.
export const Dialog = ({
  open,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  onClose(): void;
  children: ReactNode;
  wide?: boolean;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={() => {}}
      className={cx(
        "m-auto max-h-[90dvh] rounded-lg border border-zinc-700 bg-zinc-900 p-0 text-zinc-200 shadow-2xl backdrop:bg-black/60",
        wide ? "w-[min(64rem,95vw)]" : "w-[min(32rem,95vw)]",
      )}
    >
      {open && <div className="p-5">{children}</div>}
    </dialog>
  );
};

export const Section = ({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cx("border-b border-zinc-800 px-4 py-3", className)}>
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{title}</h3>
      {actions}
    </div>
    {children}
  </section>
);

// A studio page's width on a large screen: centered, as wide as is useful.
export const PAGE = "mx-auto w-full max-w-[1600px]";

export { cx };

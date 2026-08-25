"use client";

import { useEffect } from "react";

/** Простое модальное окно для форм админки. */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[#3b403e] bg-[#1c211f] p-6 shadow-sheet sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl text-ink-900">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost btn-sm">
            Закрыть
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

/** Кнопка с confirm для опасных действий. */
export function ConfirmButton({
  label,
  message,
  onConfirm,
  className = "btn-ghost btn-sm",
  disabled,
}: {
  label: string;
  message: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      onClick={() => {
        if (window.confirm(message)) onConfirm();
      }}
    >
      {label}
    </button>
  );
}

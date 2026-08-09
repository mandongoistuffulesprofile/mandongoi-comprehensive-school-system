import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "./Basics";

export function Modal({
  title,
  onClose,
  children,
  width = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div
      className="fixed inset-0 bg-inverse-surface/50 backdrop-blur-sm flex items-start justify-center pt-16 z-50 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`bg-surface-container-lowest w-full ${width} rounded-xl shadow-xl border border-outline-variant mb-16 animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
  variant?: "delete" | "save" | "update" | "default";
  supporting?: string;
  fields?: Array<{ label: string; value: string }>;
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  danger,
  loading,
  variant = "default",
  supporting,
  fields,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Determine effective variant for button styling
  const isDanger = danger || variant === "delete";

  useEffect(() => {
    confirmRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <Modal title={title} onClose={onCancel} width="max-w-sm">
      <div ref={dialogRef}>
        <p className="text-sm text-on-surface-variant mb-2">{message}</p>
        {supporting && (
          <p className="text-xs italic text-on-surface-variant mb-3">
            {supporting}
          </p>
        )}
        {fields && fields.length > 0 && (
          <dl className="mt-3 space-y-1.5 text-sm">
            {fields.map((f) => (
              <div key={f.label} className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">{f.label}</dt>
                <dd className="font-medium text-on-surface tabular-nums">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-outline-variant">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            variant={isDanger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : isDanger ? "Delete" : "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

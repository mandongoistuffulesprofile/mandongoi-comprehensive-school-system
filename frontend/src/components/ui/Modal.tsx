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
      className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm flex items-start justify-center pt-16 z-50 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${width} rounded-xl shadow-xl border border-surface-200 mb-16 animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  danger,
  loading,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel} width="max-w-sm">
      <p className="text-sm text-surface-600 mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={loading}>
          {loading ? "Processing..." : "Confirm"}
        </Button>
      </div>
    </Modal>
  );
}

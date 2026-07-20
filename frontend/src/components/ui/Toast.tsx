import { useToast } from "../../lib/toast";

const icons: Record<string, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  warning: "⚠",
};

const colors: Record<string, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
};

export function ToastContainer() {
  const { toasts, remove } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto animate-slide-in-right flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[toast.type]}`}
        >
          <span className="text-lg leading-none mt-0.5">{icons[toast.type]}</span>
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => remove(toast.id)}
            className="text-current opacity-50 hover:opacity-100 leading-none text-lg"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

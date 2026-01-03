import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle, Info } from "lucide-react";

export type ToastKind = "error" | "info";

export type ToastState = {
  open: boolean;
  kind: ToastKind;
  title?: string;
  message: string;
};

type Props = {
  state: ToastState;
  onClose: () => void;
};

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function AppToastModal({ state, onClose }: Props) {
  const isError = state.kind === "error";

  const overlayCls =
    "fixed inset-0 z-[2000] flex items-center justify-center backdrop-blur-sm bg-black/40";

  const cardCls = cx(
    "relative w-[min(92vw,520px)] rounded-2xl border p-5 shadow-2xl",
    "bg-white text-gray-900 border-black/10 dark:bg-zinc-950 dark:text-gray-100 dark:border-white/10"
  );

  const iconWrapCls = cx(
    "flex h-9 w-9 items-center justify-center rounded-xl border",
    isError
      ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
      : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
  );

  const title = state.title ?? (isError ? "Something went wrong" : "Info");

  return (
    <AnimatePresence>
      {state.open && (
        <motion.div
          className={overlayCls}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className={cardCls}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] text-gray-700 hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
              aria-label="Close"
              title="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3 pr-8">
              <div className={iconWrapCls}>
                {isError ? <AlertTriangle size={18} /> : <Info size={18} />}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {state.message}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs font-medium border border-black/10 bg-black/[0.03] text-gray-700 hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
              >
                OK
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

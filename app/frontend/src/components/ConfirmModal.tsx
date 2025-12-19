import { motion, AnimatePresence } from "framer-motion";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  open?: boolean;
}

export default function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  open = true,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="
            fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm
            bg-black/30 dark:bg-black/60
          "
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="
              w-80 flex flex-col items-center gap-6 p-6
              rounded-2xl border shadow-2xl backdrop-blur-md

              bg-white/95 border-black/10 shadow-black/10
              dark:bg-gradient-to-b dark:from-zinc-900/90 dark:to-zinc-950/90
              dark:border-white/10 dark:shadow-black/50
            "
          >
            <p className="text-center text-lg font-semibold leading-relaxed text-gray-900 dark:text-gray-100">
              {message}
            </p>

            <div className="flex gap-3 w-full justify-center">
              <button
                onClick={onCancel}
                className="
                  w-28 px-4 py-2 rounded-lg border transition
                  border-black/10 bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]
                  focus:outline-none focus:ring-2 focus:ring-black/20

                  dark:border-transparent dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20
                  dark:focus:ring-white/30
                "
              >
                Cancel
              </button>

              <button
                onClick={onConfirm}
                className="
                  w-28 px-4 py-2 rounded-lg
                  bg-gradient-to-r from-blue-500 to-indigo-600
                  text-white font-medium shadow-md transition
                  hover:from-blue-600 hover:to-indigo-700
                  focus:outline-none focus:ring-2 focus:ring-blue-400/60
                "
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="w-80 flex flex-col items-center gap-6 p-6 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90
                       rounded-2xl border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-md"
          >
            <p className="text-gray-100 text-center text-lg font-semibold leading-relaxed">
              {message}
            </p>

            <div className="flex gap-3 w-full justify-center">
              <button
                onClick={onCancel}
                className="w-28 px-4 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 
                           focus:outline-none focus:ring-2 focus:ring-white/30 transition"
              >
                Anuluj
              </button>

              <button
                onClick={onConfirm}
                className="w-28 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 
                           text-white font-medium shadow-md hover:from-blue-600 hover:to-indigo-700
                           focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition"
              >
                Potwierdź
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

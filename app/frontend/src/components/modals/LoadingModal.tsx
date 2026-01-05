import { motion, AnimatePresence } from "framer-motion";

export default function LoadingModal() {
  return (
    <AnimatePresence>
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
            flex flex-col items-center gap-5 p-6 w-72
            rounded-2xl border shadow-2xl backdrop-blur-md

            bg-white/95 border-black/10 shadow-black/10
            dark:bg-linear-to-b dark:from-zinc-900/90 dark:to-zinc-950/90
            dark:border-white/10 dark:shadow-black/50
          "
        >
          {/* Spinner */}
          <div
            className="
              w-10 h-10 border-4 rounded-full animate-spin
              border-blue-600/30 border-t-blue-600
              dark:border-blue-500/40 dark:border-t-blue-500
            "
          />

          {/* Text */}
          <p className="text-center font-semibold text-base tracking-wide text-gray-900 dark:text-gray-100">
            Loading graph...
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

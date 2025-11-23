import { motion, AnimatePresence } from "framer-motion";

export default function LoadingModal() {
  return (
    <AnimatePresence>
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
          className="flex flex-col items-center gap-5 p-6 w-72 
                     bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 
                     rounded-2xl border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-md"
        >
          {/* Spinner */}
          <div className="w-10 h-10 border-4 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />

          {/* Text */}
          <p className="text-gray-100 text-center font-semibold text-base tracking-wide">
            Loading graph...
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

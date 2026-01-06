import { motion, AnimatePresence } from "framer-motion";

interface OntologyModalProps {
  fileName: string;
  onSelect: (namespace: string) => void;
  onCancel: () => void;
}

const options = [
  { key: "cellular_component", label: "Cellular Component" },
  { key: "molecular_function", label: "Molecular Function" },
  { key: "biological_process", label: "Biological Process" },
];

export default function OntologyModal({
  fileName,
  onSelect,
  onCancel,
}: OntologyModalProps) {
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
            p-6 w-96 rounded-2xl border shadow-2xl backdrop-blur-md

            bg-white/95 border-black/10 shadow-black/10
            dark:bg-linear-to-b dark:from-zinc-900/90 dark:to-zinc-950/90
            dark:border-white/10 dark:shadow-black/50
          "
        >
          <p className="text-base font-medium mb-6 text-center leading-relaxed text-gray-700 dark:text-gray-300">
            Choose category{" "}
            <span className="text-gray-900 dark:text-gray-100 font-semibold">
              {fileName}
            </span>
          </p>

          <div className="flex flex-col gap-3">
            {options.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className="
                  px-4 py-2 rounded-lg border
                  font-medium text-sm transition
                  focus:outline-none focus:ring-2

                  border-black/10 bg-black/4 text-gray-800 hover:bg-black/[0.07] focus:ring-blue-300
                  dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/12
                  dark:focus:ring-blue-400/40
                "
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={onCancel}
            className="
              mt-6 w-full px-4 py-2 rounded-lg
              bg-red-600/90 text-white font-semibold
              hover:bg-red-700 transition
              focus:outline-none focus:ring-2 focus:ring-red-500/50
            "
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

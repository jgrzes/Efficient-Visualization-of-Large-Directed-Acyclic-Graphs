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
          className="p-6 w-96 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90
                     rounded-2xl border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-md"
        >
          <p className="text-gray-300 text-base font-medium mb-6 text-center leading-relaxed">
            Wybierz kategorię <span className="text-gray-100 font-semibold">{fileName}</span>
          </p>

          <div className="flex flex-col gap-3">
            {options.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.05]
                           text-gray-200 font-medium text-sm hover:bg-white/[0.12]
                           focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition"
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={onCancel}
            className="mt-6 w-full px-4 py-2 rounded-lg bg-red-600/90 text-white font-semibold
                       hover:bg-red-700 transition focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            Anuluj
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

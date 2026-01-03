import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Database, Clock, Hash } from "lucide-react";

interface GraphListModalProps {
  list: {
    id: string;
    name?: string;
    num_of_vertices?: number;
    last_entry_update?: string;
  }[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

const GraphListModal: React.FC<GraphListModalProps> = ({
  list,
  onSelect,
  onClose,
}) => {
  const formatDate = (iso?: string) => {
    if (!iso) return "Unknown date";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="
          fixed inset-0 z-[1000] flex items-center justify-center backdrop-blur-sm
          bg-black/30 dark:bg-black/70
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
            relative w-[min(96vw,620px)]
            max-h-[80vh]
            rounded-2xl border
            shadow-2xl
            p-5
            flex flex-col

            border-black/10
            bg-white/95
            text-gray-900
            shadow-black/10

            dark:border-white/10
            dark:bg-gradient-to-b dark:from-zinc-900/95 dark:to-zinc-950/95
            dark:text-gray-100
            dark:shadow-black/80
          "
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="
              absolute right-3 top-3 z-20
              inline-flex h-8 w-8 items-center justify-center
              rounded-full transition

              bg-black/5 text-gray-600
              hover:bg-black/10 hover:text-gray-900

              dark:bg-white/5 dark:text-gray-400
              dark:hover:bg-white/10 dark:hover:text-white
            "
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-1 pr-10">
            <Database size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Saved graphs in group
            </h3>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Choose one of the saved layouts to load it into the viewer.
          </p>

          {/* List */}
          <div
            className="
              flex-1 overflow-y-auto
              rounded-xl border
              p-2.5
              space-y-1.5

              border-black/10
              bg-black/[0.02]

              dark:border-white/5
              dark:bg-black/20
            "
          >
            {list.length === 0 && (
              <div className="flex items-center justify-center py-6 text-xs text-gray-600 dark:text-gray-400">
                No graphs found in this group.
              </div>
            )}

            {list.map((g) => (
              <button
                key={g.id}
                onClick={() => onSelect(g.id)}
                className="
                  w-full text-left rounded-lg
                  border border-transparent
                  px-3 py-2.5
                  transition
                  flex flex-col gap-1

                  bg-white hover:bg-black/[0.03]
                  hover:border-blue-600/30

                  dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80
                  dark:hover:border-blue-500/40
                "
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-[13px] truncate text-gray-900 dark:text-gray-100">
                    {g.name || "(no name)"}
                  </div>

                  {typeof g.num_of_vertices === "number" && (
                    <div className="text-[11px] whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {g.num_of_vertices} nodes
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                  <div className="inline-flex items-center gap-1">
                    <Hash size={11} />
                    <span className="font-mono break-all">{g.id}</span>
                  </div>
                </div>

                {g.last_entry_update && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5 dark:text-gray-500">
                    <Clock size={11} />
                    <span>{formatDate(g.last_entry_update)}</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="
                inline-flex items-center gap-1.5
                rounded-lg px-3 py-1.5
                text-xs font-medium transition
                border border-black/10 bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]

                dark:border-transparent dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10
              "
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GraphListModal;

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import type { LoadSourceModalProps } from "./types";
import Tabs, { type LoadTab } from "./Tabs";
import FileTab from "./FileTab";
import HashTab from "./HashTab";
import DbTab from "./DbTab";

const LoadSourceModal: React.FC<LoadSourceModalProps> = ({
  open,
  onClose,
  onSelectFile,
  onSelectHash,
  onSelectDb,
  loading,
  error,
  groups,
  onRefreshGroups,
}) => {
  const [activeTab, setActiveTab] = useState<LoadTab>("file");
  const [hash, setHash] = useState("");

  useEffect(() => {
    if (!open) {
      setHash("");
      setActiveTab("file");
    }
  }, [open]);

  const handleHashSubmit = async () => {
    const h = hash.trim();
    if (!h || loading) return;
    await onSelectHash(h);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="
          fixed inset-0 z-1000 flex items-center justify-center backdrop-blur-sm
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
            relative w-[min(96vw,720px)]
            max-h-[84vh]
            rounded-2xl border
            shadow-2xl
            p-5
            flex flex-col

            border-black/10 bg-white/95 text-gray-900 shadow-black/10
            dark:border-white/10 dark:bg-linear-to-b dark:from-zinc-900/95 dark:to-zinc-950/95
            dark:text-gray-100 dark:shadow-black/80
          "
        >
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

          <div className="mb-4 pr-10">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Load data
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Choose whether you want to load a graph from a local file, by hash, or from a group.
            </p>
          </div>

          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {activeTab === "file" && <FileTab onClose={onClose} onSelectFile={onSelectFile} />}

          {activeTab === "hash" && (
            <HashTab
              hash={hash}
              setHash={setHash}
              loading={loading}
              error={error}
              onClose={onClose}
              onSubmit={handleHashSubmit}
            />
          )}

          {activeTab === "db" && (
            <DbTab
              groups={groups}
              loading={loading}
              error={error}
              onRefreshGroups={onRefreshGroups}
              onClose={onClose}
              onSelectDb={onSelectDb}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoadSourceModal;

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save } from "lucide-react";

import type { SaveGraphModalProps } from "./types";
import GroupsPanel from "./GroupsPanel";
import SaveFormPanel from "./SaveFormPanel";

const SaveGraphModal: React.FC<SaveGraphModalProps> = ({
  open,
  onClose,
  onSubmit,
  loading,
  hash,
  error,
  groups,
  groupsLoading,
  onRefreshGroups,
}) => {
  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setGroupName("");
      setPassword("");
      setTouched(false);
      setGroupSearch("");
      setSelectedGroup(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!groupName.trim() && !password.trim()) {
      onSubmit(null, null);
      return;
    }

    if (groupName.trim() && !password.trim()) return;

    onSubmit(groupName.trim(), password.trim());
  };

  if (!open) return null;

  const disabled = loading || (!!groupName.trim() && !password.trim());

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

          <div className="mb-3 pr-8">
            <div className="flex items-center gap-2 mb-1">
              <Save size={18} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Save graph layout
              </h2>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Save the current layout to the database. You can optionally assign it to a group
              (for sharing / organizing).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <GroupsPanel
                groups={groups}
                groupsLoading={groupsLoading}
                onRefreshGroups={onRefreshGroups}
                groupSearch={groupSearch}
                setGroupSearch={setGroupSearch}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
                setGroupName={setGroupName}
              />

              <SaveFormPanel
                groupName={groupName}
                setGroupName={setGroupName}
                password={password}
                setPassword={setPassword}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
                touched={touched}
                error={error}
                hash={hash}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="
                  inline-flex items-center gap-1.5
                  rounded-lg px-3 py-1.5
                  text-xs font-medium transition
                  border border-black/10 bg-black/4 text-gray-700 hover:bg-black/8
                  dark:border-transparent dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10
                "
              >
                Close
              </button>

              <button
                type="submit"
                disabled={disabled}
                className={`
                  inline-flex items-center gap-1.5
                  rounded-lg px-3 py-1.5
                  text-xs font-medium transition
                  ${
                    disabled
                      ? "bg-blue-600/25 text-gray-400 cursor-not-allowed dark:bg-blue-600/40 dark:text-gray-200/60"
                      : "bg-blue-600/90 text-white hover:bg-blue-500"
                  }
                `}
              >
                <Save size={14} />
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SaveGraphModal;

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Database, Lock, CheckCircle2, Copy, AlertTriangle } from "lucide-react";

interface SaveGraphModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (groupName: string | null, password: string | null) => void;
  loading: boolean;
  hash: string | null;
  error: string | null;
}

const SaveGraphModal: React.FC<SaveGraphModalProps> = ({
  open,
  onClose,
  onSubmit,
  loading,
  hash,
  error,
}) => {
  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (hash) {
      setPassword("");
    }
  }, [hash]);

  if (!open) return null;

  const savingView = !hash;

  const canSubmit =
    !loading &&
    (groupName.trim().length === 0 ||
      (groupName.trim().length > 0 && password.trim().length > 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const g = groupName.trim();
    const p = password.trim();

    if (g && !p) return; // safety
    onSubmit(g || null, p || null);
  };

  const handleCopy = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
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
            relative w-[min(92vw,460px)]
            rounded-2xl border border-white/10
            bg-gradient-to-b from-zinc-900/95 to-zinc-950/95
            shadow-2xl shadow-black/80
            text-gray-100
            p-6
          "
        >
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="
              absolute right-3 top-3 z-20
              inline-flex h-8 w-8 items-center justify-center
              rounded-full bg-white/5 text-gray-400
              hover:bg-white/10 hover:text-white transition
            "
          >
            <X size={18} />
          </button>

          {savingView ? (
            <>
              <h2 className="text-sm font-semibold text-white mb-1">
                Save layout to database
              </h2>
              <p className="text-xs text-gray-400 mb-5">
                You can save the current layout optionally inside a{" "}
                <span className="font-semibold">named group</span>. If the group
                doesn&apos;t exist, it will be created with the given password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] text-gray-300">
                    <Database size={14} />
                    Group name (optional)
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. my-project"
                    className="
                      w-full rounded-lg
                      bg-black/60 border border-white/10
                      px-2.5 py-1.5
                      text-[11px] text-gray-200
                      outline-none
                      focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60
                    "
                    disabled={loading}
                  />
                  <p className="text-[10px] text-gray-500">
                    Leave empty to save without assigning to a group.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] text-gray-300">
                    <Lock size={14} />
                    Group password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      groupName.trim()
                        ? "Required when group name is set"
                        : "Optional"
                    }
                    className="
                      w-full rounded-lg
                      bg-black/60 border border-white/10
                      px-2.5 py-1.5
                      text-[11px] text-gray-200
                      outline-none
                      focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60
                    "
                    disabled={loading}
                  />
                  {groupName.trim().length > 0 && (
                    <p className="text-[10px] text-gray-500">
                      This password will be used to create the group (if new) or
                      to verify access.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                    <AlertTriangle size={12} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="
                      inline-flex items-center gap-1.5
                      rounded-lg px-3 py-1.5
                      text-xs font-medium
                      bg-white/5 text-gray-300
                      hover:bg-white/10
                      transition
                    "
                    disabled={loading}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`
                      inline-flex items-center gap-1.5
                      rounded-lg px-3 py-1.5
                      text-xs font-medium
                      transition
                      ${canSubmit
                        ? "bg-blue-600/90 text-white hover:bg-blue-500"
                        : "bg-blue-600/40 text-gray-200/60 cursor-not-allowed"
                      }
                    `}
                  >
                    <Database size={14} />
                    {loading ? "Saving..." : "Save to database"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="text-emerald-400" size={18} />
                <h2 className="text-sm font-semibold text-white">
                  Layout saved
                </h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Your graph layout was saved to the database. You can use the
                following ID to load it by hash or share it.
              </p>

              <div className="space-y-2 mb-4">
                <label className="text-[11px] text-gray-300">
                  Graph hash / ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={hash ?? ""}
                    className="
                      flex-1 rounded-lg
                      bg-black/60 border border-white/10
                      px-2.5 py-1.5
                      text-[11px] text-gray-200
                      outline-none
                    "
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="
                      inline-flex items-center gap-1.5
                      rounded-lg px-2.5 py-1.5
                      text-[11px] font-medium
                      bg-white/8 text-gray-100
                      hover:bg-white/15
                      transition
                    "
                  >
                    <Copy size={13} />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    inline-flex items-center gap-1.5
                    rounded-lg px-3 py-1.5
                    text-xs font-medium
                    bg-blue-600/90 text-white
                    hover:bg-blue-500
                    transition
                  "
                >
                  Close
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SaveGraphModal;

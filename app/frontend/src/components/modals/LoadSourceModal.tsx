import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderOpen, Database, RefreshCw, Search, Lock } from "lucide-react";

interface GroupInfo {
  group_name: string;
  created_at?: string;
}

interface LoadSourceModalProps {
  open: boolean;
  onClose: () => void;
  onSelectFile: () => void;
  onSelectDb: (groupName: string, password: string) => void;
  loading: boolean;
  error: string | null;
  groups: GroupInfo[];
  onRefreshGroups: () => void;
}

const LoadSourceModal: React.FC<LoadSourceModalProps> = ({
  open,
  onClose,
  onSelectFile,
  onSelectDb,
  loading,
  error,
  groups,
  onRefreshGroups,
}) => {
  const [activeTab, setActiveTab] = useState<"file" | "db">("file");

  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");

  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setGroupName("");
      setPassword("");
      setGroupSearch("");
      setSelectedGroup(null);
      setActiveTab("file");
    }
  }, [open]);

  useEffect(() => {
    if (selectedGroup) {
      setGroupName(selectedGroup);
    }
  }, [selectedGroup]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => (g.group_name || "").toLowerCase().includes(q));
  }, [groupSearch, groups]);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString();
  };

  const handleDbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !password.trim() || loading) return;
    onSelectDb(groupName.trim(), password.trim());
  };

  if (!open) return null;

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
            relative w-[min(96vw,720px)]
            max-h-[84vh]
            rounded-2xl border
            shadow-2xl
            p-5
            flex flex-col

            border-black/10 bg-white/95 text-gray-900 shadow-black/10
            dark:border-white/10 dark:bg-gradient-to-b dark:from-zinc-900/95 dark:to-zinc-950/95
            dark:text-gray-100 dark:shadow-black/80
          "
        >
          {/* Close */}
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
          <div className="mb-4 pr-10">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Load data
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Choose whether you want to load a graph from a local file or from a saved layout
              in the database (group).
            </p>
          </div>

          {/* Tabs */}
          <div className="flex mb-4 border-b border-black/10 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`
                px-3 py-1.5 inline-flex items-center gap-1.5 border-b-2 transition
                ${
                  activeTab === "file"
                    ? "border-blue-600 text-blue-700 dark:border-blue-500 dark:text-blue-400"
                    : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }
              `}
            >
              <FolderOpen size={14} />
              From file
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("db")}
              className={`
                px-3 py-1.5 inline-flex items-center gap-1.5 border-b-2 transition
                ${
                  activeTab === "db"
                    ? "border-blue-600 text-blue-700 dark:border-blue-500 dark:text-blue-400"
                    : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }
              `}
            >
              <Database size={14} />
              From database (group)
            </button>
          </div>

          {/* BODY */}
          {activeTab === "file" ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Load a graph or layout from a local file. Supported formats:
                  <span className="font-mono text-[11px]"> .obo, .json</span>.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    inline-flex items-center gap-1.5
                    rounded-lg px-3 py-1.5
                    text-xs font-medium transition
                    border border-black/10 bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]
                    dark:border-transparent dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={onSelectFile}
                  className="
                    inline-flex items-center gap-1.5
                    rounded-lg px-3 py-1.5
                    text-xs font-medium
                    bg-blue-600/90 text-white
                    hover:bg-blue-500
                    transition
                  "
                >
                  <FolderOpen size={14} />
                  Choose file…
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                {/* Left: groups list */}
                <div className="md:w-1/2 w-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-gray-700 dark:text-gray-300">
                      Existing groups
                    </span>

                    <button
                      type="button"
                      onClick={onRefreshGroups}
                      className="
                        inline-flex items-center gap-1
                        rounded-full px-2 py-1
                        text-[10px] font-medium transition
                        border border-black/10 bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]
                        dark:border-transparent dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10
                      "
                    >
                      <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                      Refresh
                    </button>
                  </div>

                  <div className="mb-2 relative">
                    <div
                      className="
                        flex items-center gap-1.5
                        rounded-lg border px-2 py-1

                        border-black/10 bg-white
                        dark:border-white/10 dark:bg-black/40
                      "
                    >
                      <Search size={12} className="text-gray-500 dark:text-gray-400" />
                      <input
                        type="text"
                        className="
                          bg-transparent border-none outline-none
                          text-[11px] w-full

                          text-gray-900 placeholder:text-gray-400
                          dark:text-gray-100 dark:placeholder:text-gray-500
                        "
                        placeholder="Search groups by name..."
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div
                    className="
                      flex-1 min-h-[140px] max-h-[220px]
                      overflow-y-auto
                      rounded-xl border
                      p-1.5
                      space-y-1

                      border-black/10 bg-black/[0.02]
                      dark:border-white/5 dark:bg-black/20
                    "
                  >
                    {filteredGroups.length === 0 ? (
                      <div className="flex items-center justify-center py-6 text-xs text-gray-600 dark:text-gray-400">
                        No groups found.
                      </div>
                    ) : (
                      filteredGroups.map((g) => (
                        <button
                          key={g.group_name}
                          type="button"
                          onClick={() =>
                            setSelectedGroup(g.group_name === selectedGroup ? null : g.group_name)
                          }
                          className={`
                            w-full text-left
                            rounded-lg px-2.5 py-1.5
                            text-[11px]
                            border
                            flex flex-col gap-0.5
                            transition
                            ${
                              g.group_name === selectedGroup
                                ? `
                                  bg-blue-600/10 border-blue-600/30 text-blue-800
                                  dark:bg-blue-600/20 dark:border-blue-500/60 dark:text-blue-50
                                `
                                : `
                                  bg-white border-black/10 hover:bg-black/[0.03]
                                  dark:bg-zinc-900/60 dark:border-white/5 dark:hover:bg-zinc-800/80
                                `
                            }
                          `}
                        >
                          <div className="font-medium truncate">{g.group_name}</div>
                          {g.created_at && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                              created {formatDate(g.created_at)}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: group + password form */}
                <div className="md:w-1/2 w-full flex flex-col">
                  <form onSubmit={handleDbSubmit} className="space-y-3 flex-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-gray-700 dark:text-gray-300">
                        Group name
                      </label>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Select from list or type name"
                        className="
                          w-full rounded-lg
                          px-2.5 py-1.5
                          text-[11px]
                          outline-none

                          bg-white border border-black/10 text-gray-900
                          focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40

                          dark:bg-black/60 dark:border-white/10 dark:text-gray-200
                          dark:focus:border-blue-500 dark:focus:ring-blue-500/60
                        "
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-300">
                        <Lock size={12} className="text-gray-500 dark:text-gray-400" />
                        Group password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Required to access the group"
                        className="
                          w-full rounded-lg
                          px-2.5 py-1.5
                          text-[11px]
                          outline-none

                          bg-white border border-black/10 text-gray-900
                          focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40

                          dark:bg-black/60 dark:border-white/10 dark:text-gray-200
                          dark:focus:border-blue-500 dark:focus:ring-blue-500/60
                        "
                      />
                    </div>

                    {error && (
                      <div className="text-[11px] text-red-600 dark:text-red-400">
                        {error}
                      </div>
                    )}

                    <div className="flex-1" />

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="
                          inline-flex items-center gap-1.5
                          rounded-lg px-3 py-1.5
                          text-xs font-medium transition
                          border border-black/10 bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]
                          dark:border-transparent dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10
                        "
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={loading || !groupName.trim() || !password.trim()}
                        className={`
                          inline-flex items-center gap-1.5
                          rounded-lg px-3 py-1.5
                          text-xs font-medium
                          transition
                          ${
                            loading || !groupName.trim() || !password.trim()
                              ? "bg-blue-600/25 text-gray-400 cursor-not-allowed dark:bg-blue-600/40 dark:text-gray-200/60"
                              : "bg-blue-600/90 text-white hover:bg-blue-500"
                          }
                        `}
                      >
                        <Database size={14} />
                        {loading ? "Loading..." : "Open group"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoadSourceModal;

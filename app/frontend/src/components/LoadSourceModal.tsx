import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderOpenDot, Database, AlertTriangle } from "lucide-react";

interface LoadSourceModalProps {
    open: boolean;
    onClose: () => void;
    onSelectFile: () => void;
    onSelectDb: (groupName: string, password: string) => void;
    loading?: boolean;
    error?: string | null;
}

const LoadSourceModal: React.FC<LoadSourceModalProps> = ({
    open,
    onClose,
    onSelectFile,
    onSelectDb,
    loading = false,
    error,
}) => {
    const [groupName, setGroupName] = useState("");
    const [password, setPassword] = useState("");

    if (!open) return null;

    const canSubmitDb =
        groupName.trim().length > 0 && password.trim().length > 0 && !loading;

    const handleDbSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmitDb) return;
        onSelectDb(groupName.trim(), password.trim());
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
            relative w-[min(92vw,480px)]
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

                    <h2 className="text-sm font-semibold text-white mb-1">
                        Load data
                    </h2>
                    <p className="text-xs text-gray-400 mb-5">
                        Choose how you want to load the graph. You can either upload a file
                        or load a saved layout from a password-protected group in the
                        database.
                    </p>

                    {/* FILE SECTION */}
                    <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                                <FolderOpenDot size={20} />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-semibold text-white">
                                    Load from file
                                </div>
                                <p className="text-[11px] text-gray-400">
                                    Supports OBO ontologies and JSON exports created from
                                    this tool.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onSelectFile}
                            className="
                inline-flex items-center gap-1.5
                rounded-lg px-3 py-1.5
                text-xs font-medium
                bg-emerald-600/90 text-white
                hover:bg-emerald-500
                transition
              "
                        >
                            <FolderOpenDot size={14} />
                            File
                        </button>
                    </div>

                    {/* DB SECTION */}
                    <form onSubmit={handleDbSubmit} className="mt-2 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                                <Database size={20} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-white">
                                    Load from database (group)
                                </div>
                                <p className="mt-1 text-[11px] text-gray-400">
                                    Enter the <span className="font-semibold">group name</span> and
                                    <span className="font-semibold"> password</span> to list all
                                    graphs saved in that group.
                                </p>

                                <div className="mt-3 space-y-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] text-gray-400">
                                            Group name
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
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] text-gray-400">
                                            Group password
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
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
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                                            <AlertTriangle size={12} />
                                            <span>{error}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

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
                                disabled={!canSubmitDb}
                                className={`
                  inline-flex items-center gap-1.5
                  rounded-lg px-3 py-1.5
                  text-xs font-medium
                  transition
                  ${canSubmitDb
                                        ? "bg-blue-600/90 text-white hover:bg-blue-500"
                                        : "bg-blue-600/40 text-gray-200/60 cursor-not-allowed"
                                    }
                `}
                            >
                                <Database size={14} />
                                {loading ? "Loading..." : "Load from group"}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LoadSourceModal;

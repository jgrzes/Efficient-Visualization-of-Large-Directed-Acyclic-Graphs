import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Save,
  Link as LinkIcon,
  Lock,
  Info,
  Search,
  RefreshCw,
} from "lucide-react";

type GroupInfo = {
  group_name: string;
  created_at?: string;
};

interface SaveGraphModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (groupName: string | null, password: string | null) => void;
  loading: boolean;          // loading == Saving in progress
  hash: string | null;
  error: string | null;

  groups: GroupInfo[];
  groupsLoading: boolean;
  onRefreshGroups: () => void;
}

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

  useEffect(() => {
    if (selectedGroup) {
      setGroupName(selectedGroup);
    }
  }, [selectedGroup]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      (g.group_name || "").toLowerCase().includes(q)
    );
  }, [groupSearch, groups]);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!groupName.trim() && !password.trim()) {
      onSubmit(null, null);
      return;
    }

    if (groupName.trim() && !password.trim()) {
      return;
    }

    onSubmit(groupName.trim(), password.trim());
  };

  if (!open) return null;

  const showGroupPasswordWarning =
    touched && !!groupName.trim() && !password.trim();

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
            relative w-[min(96vw,720px)]
            max-h-[84vh]
            rounded-2xl border border-white/10
            bg-gradient-to-b from-zinc-900/95 to-zinc-950/95
            shadow-2xl shadow-black/80
            text-gray-100
            p-5
            flex flex-col
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

          {/* Header */}
          <div className="mb-3 pr-8">
            <div className="flex items-center gap-2 mb-1">
              <Save size={18} className="text-blue-400" />
              <h2 className="text-sm font-semibold text-white">
                Save graph layout
              </h2>
            </div>
            <p className="text-xs text-gray-400">
              Save the current layout to the database. You can optionally
              assign it to a group (for sharing / organizing).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              {/* Left: groups list + search */}
              <div className="md:w-1/2 w-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-300">
                    Existing groups
                  </span>
                  <button
                    type="button"
                    onClick={onRefreshGroups}
                    className="
                      inline-flex items-center gap-1
                      rounded-full px-2 py-1
                      text-[10px] font-medium
                      bg-white/5 text-gray-300
                      hover:bg-white/10
                      transition
                    "
                  >
                    <RefreshCw
                      size={11}
                      className={groupsLoading ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                </div>

                <div className="mb-2">
                  <div
                    className="
                      flex items-center gap-1.5
                      rounded-lg border border-white/10 bg-black/40
                      px-2 py-1
                    "
                  >
                    <Search size={12} className="text-gray-400" />
                    <input
                      type="text"
                      className="
                        bg-transparent border-none outline-none
                        text-[11px] text-gray-100
                        placeholder:text-gray-500
                        w-full
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
                    rounded-xl border border-white/5
                    bg-black/20
                    p-1.5
                    space-y-1
                  "
                >
                  {groupsLoading ? (
                    <div className="flex items-center justify-center py-6 text-xs text-gray-400">
                      Loading groups...
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="flex items-center justify-center py-6 text-xs text-gray-400">
                      No groups found.
                    </div>
                  ) : (
                    filteredGroups.map((g) => (
                      <button
                        key={g.group_name}
                        type="button"
                        onClick={() =>
                          setSelectedGroup(
                            g.group_name === selectedGroup ? null : g.group_name
                          )
                        }
                        className={`
                          w-full text-left
                          rounded-lg px-2.5 py-1.5
                          text-[11px]
                          border
                          flex flex-col gap-0.5
                          ${g.group_name === selectedGroup
                            ? "bg-blue-600/20 border-blue-500/60 text-blue-50"
                            : "bg-zinc-900/60 border-white/5 hover:bg-zinc-800/80"
                          }
                        `}
                      >
                        <div className="font-medium truncate">
                          {g.group_name}
                        </div>
                        {g.created_at && (
                          <div className="text-[10px] text-gray-400">
                            created {formatDate(g.created_at)}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>

                <p className="mt-2 text-[10px] text-gray-500">
                  Click a group to fill in its name. You can also type a new
                  group name on the right – it will be created on save if it
                  does not exist yet.
                </p>
              </div>

              {/* Right: group + password form */}
              <div className="md:w-1/2 w-full flex flex-col">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-gray-300">
                      Group (optional)
                    </label>
                    <span className="text-[10px] text-gray-500">
                      leave empty to save without a group
                    </span>
                  </div>

                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => {
                      setGroupName(e.target.value);
                      if (e.target.value !== selectedGroup) {
                        setSelectedGroup(null);
                      }
                    }}
                    placeholder="Select from list or type new group name"
                    className="
                      w-full rounded-lg
                      bg-black/60 border border-white/10
                      px-2.5 py-1.5
                      text-[11px] text-gray-200
                      outline-none
                      focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60
                    "
                  />

                  <div className="space-y-1.5 mt-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-300">
                      <Lock size={12} />
                      Group password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        groupName.trim()
                          ? "Required when saving to a group"
                          : "Fill in only if you use a group"
                      }
                      className="
                        w-full rounded-lg
                        bg-black/60 border border-white/10
                        px-2.5 py-1.5
                        text-[11px] text-gray-200
                        outline-none
                        focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60
                      "
                    />
                    <div className="flex items-start gap-1.5 text-[10px] text-gray-400">
                      <Info size={11} className="mt-[2px] shrink-0" />
                      <span>
                        If you provide a group name and password:
                        <br />
                        <span className="text-gray-300">
                          – if this group already exists, the password must
                          match,
                        </span>
                        <br />
                        <span className="text-gray-300">
                          – if it does not exist yet, it will be{" "}
                          <span className="text-blue-300">
                            created with this password
                          </span>{" "}
                          when you save.
                        </span>
                      </span>
                    </div>
                  </div>

                  {showGroupPasswordWarning && (
                    <div className="text-[11px] text-red-400 mt-1">
                      Group password is required when saving to a group.
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="text-[11px] text-red-400 mt-3">{error}</div>
                )}

                {/* Hash / success info */}
                {hash && (
                  <div
                    className="
                      mt-3 rounded-lg border border-emerald-500/50 bg-emerald-500/5
                      px-3 py-2 text-[11px] text-emerald-100 flex flex-col gap-1
                    "
                  >
                    <div className="flex items-center gap-1.5">
                      <LinkIcon size={12} />
                      <span className="font-semibold">Saved successfully</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-emerald-100/90">Graph id:</span>
                      <span className="font-mono break-all text-emerald-50">
                        {hash}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2">
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
              >
                Close
              </button>
              <button
                type="submit"
                disabled={
                  loading || (!!groupName.trim() && !password.trim())
                }
                className={`
                  inline-flex items-center gap-1.5
                  rounded-lg px-3 py-1.5
                  text-xs font-medium
                  transition
                  ${loading ||
                    (!!groupName.trim() && !password.trim())
                    ? "bg-blue-600/40 text-gray-200/60 cursor-not-allowed"
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

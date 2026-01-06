import React, { useMemo } from "react";
import { RefreshCw, Search } from "lucide-react";
import type { GroupInfo } from "./types";
import { formatDate } from "../../../graph/utils/date";

interface GroupsPanelProps {
  groups: GroupInfo[];
  groupsLoading: boolean;
  onRefreshGroups: () => void;

  groupSearch: string;
  setGroupSearch: (v: string) => void;

  selectedGroup: string | null;
  setSelectedGroup: (v: string | null) => void;

  setGroupName: (v: string) => void;
}

const GroupsPanel: React.FC<GroupsPanelProps> = ({
  groups,
  groupsLoading,
  onRefreshGroups,
  groupSearch,
  setGroupSearch,
  selectedGroup,
  setSelectedGroup,
  setGroupName,
}) => {
  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => (g.group_name || "").toLowerCase().includes(q));
  }, [groupSearch, groups]);

  return (
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
            border border-black/10 bg-black/4 text-gray-700 hover:bg-black/8
            dark:border-transparent dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10
          "
        >
          <RefreshCw size={11} className={groupsLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="mb-2">
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
              bg-transparent border-none outline-none w-full text-[11px]
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
          flex-1 min-h-35 max-h-55
          overflow-y-auto
          rounded-xl border
          p-1.5
          space-y-1
          border-black/10 bg-black/2
          dark:border-white/5 dark:bg-black/20
        "
      >
        {groupsLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-600 dark:text-gray-400">
            Loading groups...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-600 dark:text-gray-400">
            No groups found.
          </div>
        ) : (
          filteredGroups.map((g) => (
            <button
              key={g.group_name}
              type="button"
              onClick={() => {
                const next = g.group_name === selectedGroup ? null : g.group_name;
                setSelectedGroup(next);
                if (next) setGroupName(next);
              }}
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
                      bg-white border-black/10 hover:bg-black/3
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

      <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-500">
        Click a group to fill in its name. You can also type a new group name on the
        right – it will be created on save if it does not exist yet.
      </p>
    </div>
  );
};

export default GroupsPanel;

import React, { useEffect, useState } from "react";
import { Database, Lock } from "lucide-react";
import GroupsList from "./GroupsList";

interface DbTabProps {
  groups: any[];
  loading: boolean;
  error: string | null;
  onRefreshGroups: () => void;
  onClose: () => void;
  onSelectDb: (groupName: string, password: string) => void | Promise<void>;
}

const DbTab: React.FC<DbTabProps> = ({
  groups,
  loading,
  error,
  onRefreshGroups,
  onClose,
  onSelectDb,
}) => {
  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGroup) setGroupName(selectedGroup);
  }, [selectedGroup]);

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4 flex-1">
        <GroupsList
          groups={groups}
          loading={loading}
          onRefresh={onRefreshGroups}
          search={groupSearch}
          setSearch={setGroupSearch}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
        />

        <div className="md:w-1/2 w-full flex flex-col">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!groupName.trim() || !password.trim() || loading) return;
              await onSelectDb(groupName.trim(), password.trim());
            }}
            className="space-y-3 flex-1"
          >
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
                  w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none
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
                  w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none
                  bg-white border border-black/10 text-gray-900
                  focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40
                  dark:bg-black/60 dark:border-white/10 dark:text-gray-200
                  dark:focus:border-blue-500 dark:focus:ring-blue-500/60
                "
              />
            </div>

            {error && <div className="text-[11px] text-red-600 dark:text-red-400">{error}</div>}

            <div className="flex-1" />

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
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !groupName.trim() || !password.trim()}
                className={`
                  inline-flex items-center gap-1.5
                  rounded-lg px-3 py-1.5
                  text-xs font-medium transition
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
  );
};

export default DbTab;

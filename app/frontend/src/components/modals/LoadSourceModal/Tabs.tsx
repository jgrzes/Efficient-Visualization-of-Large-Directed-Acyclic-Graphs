import React from "react";
import { FolderOpen, Database, Link } from "lucide-react";

export type LoadTab = "file" | "hash" | "db";

interface TabsProps {
  activeTab: LoadTab;
  setActiveTab: (t: LoadTab) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  const tabBtn = (active: boolean) =>
    `px-3 py-1.5 inline-flex items-center gap-1.5 border-b-2 transition ${
      active
        ? "border-blue-600 text-blue-700 dark:border-blue-500 dark:text-blue-400"
        : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
    }`;

  return (
    <div className="flex mb-4 border-b border-black/10 dark:border-white/10 text-xs">
      <button type="button" onClick={() => setActiveTab("file")} className={tabBtn(activeTab === "file")}>
        <FolderOpen size={14} />
        From file
      </button>
      <button type="button" onClick={() => setActiveTab("hash")} className={tabBtn(activeTab === "hash")}>
        <Link size={14} />
        From hash
      </button>
      <button type="button" onClick={() => setActiveTab("db")} className={tabBtn(activeTab === "db")}>
        <Database size={14} />
        From database (group)
      </button>
    </div>
  );
};

export default Tabs;

import React from "react";
import { Search, Star, MessageSquare, Info } from "lucide-react";

type TabKey = "search" | "favorites" | "comments" | "graph";

interface TabNavigationProps {
  activeTab: TabKey;
  expanded: boolean;
  onTabClick: (tab: TabKey) => void;
}

type IconType = React.ComponentType<{ size?: number; className?: string }>;

const TABS: { key: TabKey; label: string; Icon: IconType }[] = [
  { key: "search",    label: "Szukaj",     Icon: Search },
  { key: "favorites", label: "Ulubione",   Icon: Star },
  { key: "comments",  label: "Komentarze", Icon: MessageSquare },
  { key: "graph",     label: "Graf",       Icon: Info },
];

const baseBtn =
  "w-10 h-10 flex items-center justify-center rounded-xl transition " +
  "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 " +
  "focus:ring-offset-2 focus:ring-offset-transparent";

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, expanded, onTabClick }) => {
  const btnRefs = React.useRef<Record<TabKey, HTMLButtonElement | null>>({
    search: null,
    favorites: null,
    comments: null,
    graph: null,
  });

  return (
    <div
      className={`w-16 h-full bg-transparent flex flex-col items-center justify-center gap-5 overflow-visible ${
        !expanded ? "pl-1" : ""
      } pt-4`}
      role="tablist"
      aria-orientation="vertical"
      aria-label="Pasek aktywności"
    >
      {TABS.map(({ key, label, Icon }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            ref={(el) => { btnRefs.current[key] = el; }}
            type="button"
            onClick={() => onTabClick(key)}
            className={`${baseBtn} ${isActive && expanded ? "bg-white/10" : ""}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`right-panel-${key}`}
            id={`tab-${key}`}
            title={label}
            aria-label={label}
            tabIndex={isActive ? 0 : -1}
          >
            <Icon size={20} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
};

export default TabNavigation;

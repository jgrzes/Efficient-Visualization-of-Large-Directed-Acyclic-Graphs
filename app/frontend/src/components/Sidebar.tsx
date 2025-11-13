import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  bottomItems?: SidebarItem[];
  defaultExpanded?: boolean;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  items,
  bottomItems = [],
  defaultExpanded = true,
  className = "",
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const handleItemClick = (idx: number, onClick?: () => void) => {
    setActiveIndex(idx);
    onClick?.();
  };

  return (
    <aside
      className={[
        "fixed top-0 left-0 h-screen",
        "text-gray-200 flex flex-col",
        "transition-[width] duration-300 ease-in-out",
        expanded ? "w-56" : "w-16",
        "bg-gradient-to-b from-black/80 to-black/90",
        "backdrop-blur-md shadow-2xl shadow-black/40",
        "select-none",
        "overflow-x-hidden",
        className,
      ].join(" ")}
      aria-label="Menu boczne"
    >
      {/* GÓRNY pasek: zawsze pokazuje toggle. Gdy zwinięty, centrowany bez tekstu. */}
      <div
        className={[
          "flex items-center border-b border-white/10",
          expanded ? "justify-between px-3 py-3" : "justify-center px-2 py-3",
          "overflow-x-hidden",
        ].join(" ")}
      >
        {expanded && (
          <span className="font-medium text-sm tracking-wide text-white/90">
            MENU
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-2 rounded-xl hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25 transition"
          title={expanded ? "Zwiń panel" : "Rozwiń panel"}
          aria-label={expanded ? "Zwiń panel" : "Rozwiń panel"}
        >
          {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Lista przycisków */}
      <nav
        className="flex-1 flex flex-col p-2 gap-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
        role="menu"
      >
        {items.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <SidebarButton
              key={idx}
              item={item}
              expanded={expanded}
              active={isActive}
              onClick={() => handleItemClick(idx, item.onClick)}
            />
          );
        })}
      </nav>

      {/* Dolna sekcja */}
      {bottomItems.length > 0 && (
        <div className="p-2 border-t border-white/10 overflow-x-hidden" role="menu">
          {bottomItems.map((item, idx) => (
            <SidebarButton
              key={`b-${idx}`}
              item={item}
              expanded={expanded}
              active={false}
              onClick={item.onClick}
            />
          ))}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

/* --- Pomocniczy przycisk --- */

const SidebarButton: React.FC<{
  item: SidebarItem;
  expanded: boolean;
  active: boolean;
  onClick?: () => void;
}> = ({ item, expanded, active, onClick }) => {
  return (
    <div className="relative group overflow-x-hidden">
      <button
        type="button"
        onClick={onClick}
        className={[
          "w-full flex items-center",
          "px-3 py-2.5 rounded-xl",
          "transition-colors duration-150 ease-in-out",
          active
            ? "bg-gray-800/80 text-white shadow-inner"
            : "hover:bg-white/10 text-gray-300 hover:text-white",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25",
        ].join(" ")}
        role="menuitem"
        aria-current={active ? "page" : undefined}
        title={expanded ? item.label : undefined}
      >
        <span className="shrink-0 text-[18px] leading-none">{item.icon}</span>
        <span
          className={[
            "ml-3 text-sm font-medium whitespace-nowrap transition-opacity duration-200",
            expanded ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          {item.label}
        </span>
      </button>

      {/* Tooltip przy zwiniętym pasku */}
      {!expanded && (
        <div
          className={[
            "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-150 z-50",
          ].join(" ")}
          role="tooltip"
        >
          <div className="whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium bg-white/10 text-white backdrop-blur-md border border-white/15 shadow-lg">
            {item.label}
          </div>
        </div>
      )}
    </div>
  );
};

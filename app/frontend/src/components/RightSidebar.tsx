import React from "react";
import { Search } from "lucide-react";
import SearchBar from "./SearchBar";
import { NodeInfoProps } from "./NodeInfo";

function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = React.useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState] as const;
}

interface RightSidebarProps {
  results: NodeInfoProps[];
  onSearch: (field: string, query: string) => void;
  onSelectNode: (node: NodeInfoProps) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  results,
  onSearch,
  onSelectNode,
}) => {
  const [expanded, setExpanded] = useLocalStorage<boolean>("ui.rightSidebar.expanded", true);

  return (
    <div
      className={`fixed top-0 right-0 h-screen bg-black text-gray-200 border-l border-gray-100 shadow-lg flex flex-col transition-all duration-300 ${
        expanded ? "w-80" : "w-16"
      }`}
      aria-expanded={expanded}
    >
      <div className="flex items-center gap-2 p-3 border-b border-gray-100 w-full">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-2 rounded-md hover:bg-gray-800 cursor-pointer"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Search size={20} />
        </button>

        <div className={`flex-grow transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0 pointer-events-none"} `}>
          <SearchBar onSearch={onSearch} />
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto p-3 space-y-2 transition-opacity duration-200 ${
          expanded ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {results.length > 0 && (
          <p className="text-gray-400 text-sm mb-2">
            Found {results.length} result{results.length > 1 ? "s" : ""}
          </p>
        )}

        {results.length === 0 ? (
          <p className="text-gray-500 text-center mt-4">No results</p>
        ) : (
          <ul className="space-y-2">
            {results.map((node, idx) => (
              <li
                key={idx}
                onClick={() => onSelectNode(node)}
                className="hover:bg-gray-800 rounded-lg p-3 shadow-sm cursor-pointer border border-gray-100 transition-all duration-200"
              >
                <p className="font-semibold text-gray-100 truncate">{node.name}</p>
                <p className="text-sm text-gray-400 truncate">{node.id}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;

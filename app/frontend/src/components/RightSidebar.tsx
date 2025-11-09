import React, { useState } from "react";
import { Search } from "lucide-react";
import SearchBar from "./SearchBar";
import { NodeInfoProps } from "./NodeInfo";

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
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className={`fixed top-0 right-0 h-screen bg-black text-gray-200 border-l border-gray-100 shadow-lg flex flex-col transition-all duration-300 ${
        expanded ? "w-80" : "w-16"
      }`}
    >
      {expanded ? (
        <>
          <div className="flex items-center gap-2 p-3 border-b border-gray-100 w-full">
            <button
              onClick={() => setExpanded(false)}
              className="p-2 rounded-md hover:bg-gray-800 cursor-pointer"
            >
              <Search size={20} />
            </button>
            <div className="flex-grow">
              <SearchBar onSearch={onSearch} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
        </>
      ) : (
        <button
          className="m-2 p-2 rounded-md hover:bg-gray-700 self-center cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          <Search size={20} />
        </button>
      )}
    </div>
  );
};

export default RightSidebar;

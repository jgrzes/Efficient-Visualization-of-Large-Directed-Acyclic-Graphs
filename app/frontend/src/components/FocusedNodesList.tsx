import React from "react";
import { X, Trash2 } from "lucide-react";

interface FocusedNodesListProps {
  nodeIndices: number[];
  nodeNames: string[] | null;
  onRemoveNode: (index: number) => void;
  onClear: () => void;
  onSelectNode: (index: number) => void;
}

const FocusedNodesList: React.FC<FocusedNodesListProps> = ({
  nodeIndices,
  nodeNames,
  onRemoveNode,
  onClear,
  onSelectNode,
}) => {
  const getNodeName = (index: number) => {
    return nodeNames?.[index] || `Node ${index}`;
  };

  return (
    <div
      className="fixed bottom-4 right-4 max-h-[300px] w-80 bg-white dark:bg-black/90 border border-black/10 dark:border-white/10 rounded-xl shadow-lg overflow-hidden flex flex-col"
      style={{ zIndex: 30 }}
    >
      {/* Header */}
      <div className="bg-purple-500/10 dark:bg-purple-900/20 px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
        <span className="font-semibold text-sm text-purple-700 dark:text-purple-300">
          Focused Nodes ({nodeIndices.length})
        </span>
        <button
          onClick={onClear}
          className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition"
          title="Clear all focused nodes"
        >
          <Trash2 size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {nodeIndices.map((index) => (
          <div
            key={index}
            className="px-4 py-2.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition group"
          >
            <button
              onClick={() => onSelectNode(index)}
              className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300 truncate hover:text-purple-600 dark:hover:text-purple-400 transition"
            >
              <span className="font-medium">{getNodeName(index)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                #{index}
              </span>
            </button>
            <button
              onClick={() => onRemoveNode(index)}
              className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 dark:hover:bg-red-900/20 rounded transition"
              title="Remove from focused nodes"
            >
              <X
                size={14}
                className="text-red-600 dark:text-red-400"
              />
            </button>
          </div>
        ))}
      </div>

      {nodeIndices.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No focused nodes
        </div>
      )}
    </div>
  );
};

export default FocusedNodesList;

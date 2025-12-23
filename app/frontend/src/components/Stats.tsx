import React from "react";

interface StatsProps {
  nodeCount: number;
  edgeCount: number;
  pathCount: number;
}

const Stats: React.FC<StatsProps> = ({ nodeCount, edgeCount }) => {
  return (
    <div
      id="stats-panel"
      className="
        fixed bottom-4 left-4 w-[200px] p-4 rounded-lg shadow-lg border

        bg-black text-gray-200 border-white/10
        dark:bg-black dark:text-gray-200 dark:border-white/10

        bg-white/95 text-gray-900 border-black/10
        dark:bg-black
      "
    >
      <h4 className="text-lg font-bold mb-2 text-center text-gray-900 dark:text-gray-100">
        Statistics
      </h4>

      <p className="text-sm mb-1 text-center text-gray-700 dark:text-gray-200">
        <strong className="text-gray-900 dark:text-gray-100">Nodes:</strong>{" "}
        {nodeCount}
      </p>

      <p className="text-sm text-center text-gray-700 dark:text-gray-200">
        <strong className="text-gray-900 dark:text-gray-100">Edges:</strong>{" "}
        {edgeCount}
      </p>
    </div>
  );
};

export default Stats;

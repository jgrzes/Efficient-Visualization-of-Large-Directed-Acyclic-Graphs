import React from 'react';

interface StatsProps {
  nodeCount: number;
  edgeCount: number;
  pathCount: number;
}

const Stats: React.FC<StatsProps> = ({ nodeCount, edgeCount }) => {
  return (
    <div
      id="stats-panel"
      className="fixed bottom-4 left-4 p-4 bg-black rounded-lg shadow-lg text-gray-200 w-[200px] border"
    >
      <h4 className="text-lg font-bold mb-2 text-center">Statistics</h4>
      <p className="text-sm mb-1 text-center">
        <strong>Nodes:</strong> {nodeCount}
      </p>
      <p className="text-sm text-center">
        <strong>Edges:</strong> {edgeCount}
      </p>
    </div>
  );
};

export default Stats;

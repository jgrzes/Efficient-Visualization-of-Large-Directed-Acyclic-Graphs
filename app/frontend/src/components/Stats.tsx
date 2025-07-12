import React from 'react';

interface StatsProps {
  nodeCount: number;
  edgeCount: number;
  pathCount: number;
}

const Stats: React.FC<StatsProps> = ({ nodeCount, edgeCount }) => {
  return (
    <div id="stats-panel">
      <h4>Statistics</h4>
      <p><strong>Nodes:</strong> {nodeCount}</p>
      <p><strong>Edges:</strong> {edgeCount}</p>
    </div>
  );  
};

export default Stats;

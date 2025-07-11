import React from 'react';

interface StatsProps {
  nodeCount: number;
  edgeCount: number;
  pathCount: number;
}

const Stats: React.FC<StatsProps> = ({ nodeCount, edgeCount }) => {
  return (
    <div id="stats-panel" style={{ display: 'flex', flexDirection: 'column', width: '200px' }}>
      <h4 style={{ textAlign: 'center' }}>Statistics</h4>
      <p><strong>Nodes:</strong> {nodeCount}</p>
      <p><strong>Edges:</strong> {edgeCount}</p>
    </div>
  );
};

export default Stats;

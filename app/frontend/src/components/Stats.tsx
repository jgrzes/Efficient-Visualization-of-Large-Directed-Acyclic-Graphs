import React from 'react';

interface StatsProps {
  nodeCount: number;
  edgeCount: number;
  pathCount: number;
}

const Stats: React.FC<StatsProps> = ({ nodeCount, edgeCount, pathCount }) => {
  return (
    <div id="stats-panel" style={{ display: 'flex', flexDirection: 'column', width: '200px' }}>
      <h4 style={{ textAlign: 'center' }}>Statistics</h4>
      <p><strong>Nodes:</strong> {nodeCount}</p>
      <p><strong>Edges:</strong> {edgeCount}</p>
      <p><strong>Paths:</strong> {pathCount}</p>
    </div>
  );
};

export default Stats;

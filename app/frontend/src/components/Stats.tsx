import React from 'react';

interface StatsProps {
  nodeCount: number;
  edgeCount: number;
  pathCount: number;
}

const Stats: React.FC<StatsProps> = ({ nodeCount, edgeCount, pathCount }) => {
  return (
    <div id="stats-panel">
      <h4>Statystyki</h4>
      <p><strong>Węzły:</strong> {nodeCount}</p>
      <p><strong>Krawędzie:</strong> {edgeCount}</p>
      <p><strong>Ścieżki:</strong> {pathCount}</p>
    </div>
  );
};

export default Stats;

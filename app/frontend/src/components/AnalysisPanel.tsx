import React from 'react';

interface AnalysisPanelProps {
  result: {
    hierarchy_levels: Record<string, number>;
  };
  onClose: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ result, onClose }) => {
  const hierarchy = result?.hierarchy_levels || {};

  return (
    <div id="analysis-panel">
      <h2>Hierarchy Levels</h2>
  
      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Node Count</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(hierarchy).map(([level, count]) => (
            <tr key={level}>
              <td>{level}</td>
              <td>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
  
      <div className="button-container">
        <button onClick={onClose} className="close-button">
          Close
        </button>
      </div>
    </div>
  );  
};

export default AnalysisPanel;

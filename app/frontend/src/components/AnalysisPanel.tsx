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
    <div
      id="analysis-panel"
      style={{
        marginTop: '1.5rem',
        padding: '1.5rem',
        border: '1px solid #444',
        borderRadius: '12px',
        backgroundColor: '#1f1f1f',
        maxWidth: '600px',
        marginLeft: 'auto',
        marginRight: 'auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        color: '#f0f0f0',
      }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Hierarchy Levels</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ddd' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #555', padding: '0.5rem', textAlign: 'left' }}>Level</th>
            <th style={{ borderBottom: '1px solid #555', padding: '0.5rem', textAlign: 'right' }}>Node Count</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(hierarchy).map(([level, count]) => (
            <tr key={level}>
              <td style={{ padding: '0.5rem' }}>{level}</td>
              <td style={{ padding: '0.5rem', textAlign: 'right' }}>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
        <button
          onClick={onClose}
          style={{
            padding: '0.6rem 1.2rem',
            fontSize: '1rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#007bff',
            color: '#fff',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0056b3')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#007bff')}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AnalysisPanel;

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid'

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
      className="fixed bottom-4 right-4 p-4 bg-black rounded-lg shadow-lg text-gray-200 w-[300px] border"
    >
      <h2 className="text-xl font-bold mb-4">Hierarchy Levels</h2>

      <table className="table-auto w-full border-collapse border border-gray-100">
        <thead>
          <tr className="bg-gray-700">
            <th className="border border-gray-100 px-4 py-2">Level</th>
            <th className="border border-gray-100 px-4 py-2">Node Count</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(hierarchy).map(([level, count]) => (
            <tr key={level} className="hover:bg-gray-600">
              <td className="border border-gray-100 px-4 py-2">{level}</td>
              <td className="border border-gray-100 px-4 py-2">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <XMarkIcon
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 p-1 bg-red-600 text-white rounded hover:bg-red-500 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 transition duration-200 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default AnalysisPanel;

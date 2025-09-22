import React from 'react';

export interface NodeInfoProps {
  id: string;
  name: string;
  namespace: string;
  def: string;
  synonym?: string[];
  is_a?: string[];
}

const NodeInfo: React.FC<NodeInfoProps> = ({ id, name, namespace, def, synonym, is_a }) => {
  return (
    <div
      id="info-panel"
      className="p-3 bg-black/70 backdrop-blur-md rounded-md shadow-md text-gray-200 border border-gray-100 inline-block max-w-[90vw]"
    >
      <h4 className="text-lg font-semibold mb-1 truncate">{id}</h4>
      <p className="text-sm mb-1 truncate"><strong>Name:</strong> {name}</p>
      <p className="text-sm mb-1 truncate"><strong>Namespace:</strong> {namespace}</p>
      <p className="text-sm mb-1 truncate"><strong>Definition:</strong> {def}</p>
      {synonym && synonym.length > 0 && (
        <p className="text-sm mb-1 truncate"><strong>Synonyms:</strong> {synonym.join(', ')}</p>
      )}
      {is_a && is_a.length > 0 && (
        <p className="text-sm truncate"><strong>is_a:</strong> {is_a.join(', ')}</p>
      )}
    </div>
  );
};

export default NodeInfo;

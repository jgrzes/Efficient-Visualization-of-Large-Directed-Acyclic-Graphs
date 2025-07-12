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
      className="p-6 bg-black rounded-lg shadow-lg text-gray-200 w-[300px] border"
    >
      <h4 className="text-xl font-semibold mb-2">{id}</h4>
      <p className="text-sm mb-1"><strong>Name:</strong> {name}</p>
      <p className="text-sm mb-1"><strong>Namespace:</strong> {namespace}</p>
      <p className="text-sm mb-1"><strong>Definition:</strong> {def}</p>
      {synonym && synonym.length > 0 && (
        <p className="text-sm mb-1"><strong>Synonyms:</strong> {synonym.join(', ')}</p>
      )}
      {is_a && is_a.length > 0 && (
        <p className="text-sm"><strong>is_a:</strong> {is_a.join(', ')}</p>
      )}
    </div>
  );  
};

export default NodeInfo;

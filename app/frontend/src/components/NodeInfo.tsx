import React from 'react';

export interface NodeInfoProps {
  index: number,
  id: string;
  name: string;
  namespace: string;
  def: string;
  synonym?: string[];
  is_a?: string[];
}

const NodeInfo: React.FC<NodeInfoProps> = ({index, id, name, namespace, def, synonym, is_a }) => {
  return (
    <div
      id="info-panel"
      className="p-3 bg-black/70 backdrop-blur-md rounded-md shadow-md text-gray-200 border border-gray-100 inline-block w-[800px] max-w-[90vw] break-words"
    >
      <h4 className="text-lg font-semibold mb-1">{id}</h4>
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

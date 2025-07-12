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
    <div id="info-panel">
      <h4>{id}</h4>
      <p><strong>Name:</strong> {name}</p>
      <p><strong>Namespace:</strong> {namespace}</p>
      <p><strong>Definition:</strong> {def}</p>
      {synonym && synonym.length > 0 && (
        <p><strong>Synonyms:</strong> {synonym.join(', ')}</p>
      )}
      {is_a && is_a.length > 0 && (
        <p><strong>is_a:</strong> {is_a.join(', ')}</p>
      )}
    </div>
  );  
};

export default NodeInfo;

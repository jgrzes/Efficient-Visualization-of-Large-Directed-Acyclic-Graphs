import React from 'react';

export interface NodeInfoProps {
  id: string;
  name: string;
  namespace: string;
  def: string;
  synonym?: string[];
  is_a?: string[];
  clusterInfo?: {
    clusterId: string;
    size: number;
    members: number[];
  };
  index?: number; // Optional index for potential use in NodeInfo
}

const NodeInfo: React.FC<NodeInfoProps> = ({ id, name, namespace, def, synonym, is_a, clusterInfo }) => {
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
      {clusterInfo && (
        <div style={{ marginTop: '1rem' }}>
          <h4 className="text-xl font-semibold mb-2">Cluster Info</h4>
          <p><strong>Cluster ID:</strong> {clusterInfo.clusterId}</p>
          <p><strong>Size:</strong> {clusterInfo.size}</p>
        </div>
      )}
    </div>
  );  
};

export default NodeInfo;

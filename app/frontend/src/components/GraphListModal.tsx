import React from 'react';

interface GraphListModalProps {
    list: {
        id: string;
        name?: string;
        num_of_vertices?: number;
        last_entry_update?: string;
    }[];
    onSelect: (id: string) => void;
    onClose: () => void;
}

const GraphListModal: React.FC<GraphListModalProps> = ({ list, onSelect, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 w-full max-w-lg max-h-[80vh] flex flex-col">
                <h3 className="text-lg font-semibold mb-3">Saved graphs</h3>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {list.length === 0 && (
                        <div className="text-sm text-gray-400">
                            No graphs found in database.
                        </div>
                    )}

                    {list.map((g) => (
                        <button
                            key={g.id}
                            onClick={() => onSelect(g.id)}
                            className="w-full text-left p-2 rounded bg-zinc-800 hover:bg-zinc-700 transition"
                        >
                            <div className="font-medium">
                                {g.name || '(no name)'}
                            </div>
                            <div className="text-xs text-gray-400 break-all">
                                {g.id}
                            </div>
                            {typeof g.num_of_vertices === 'number' && (
                                <div className="text-xs text-gray-500">
                                    {g.num_of_vertices} nodes
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GraphListModal;

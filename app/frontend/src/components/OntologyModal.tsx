interface OntologyModalProps {
  fileName: string;
  onSelect: (namespace: string) => void;
  onCancel: () => void;
}

const options = [
  { key: "cellular_component", label: "Cellular Component" },
  { key: "molecular_function", label: "Molecular Function" },
  { key: "biological_process", label: "Biological Process" },
];

export default function OntologyModal({ fileName, onSelect, onCancel }: OntologyModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="p-6 bg-black rounded-2xl shadow-lg border border-gray-100 w-96">
        <p className="text-sm font-medium mb-4 text-gray-300">
          Choose GO category: <strong className="text-gray-100">{fileName}</strong>
        </p>

        <div className="flex flex-col gap-2">
          {options.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="px-4 py-2 bg-transparent border border-white text-gray-200 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

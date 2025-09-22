interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6 p-6 bg-black rounded-2xl shadow-lg border border-gray w-80">
        <p className="text-gray-200 text-center font-medium">{message}</p>

        <div className="flex gap-4 w-full justify-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 w-28 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 w-28 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

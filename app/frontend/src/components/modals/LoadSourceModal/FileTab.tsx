import React from "react";
import { FolderOpen } from "lucide-react";

interface FileTabProps {
  onClose: () => void;
  onSelectFile: () => void;
}

const FileTab: React.FC<FileTabProps> = ({ onClose, onSelectFile }) => {
  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="space-y-3">
        <p className="text-xs text-gray-700 dark:text-gray-300">
          Load a graph or layout from a local file. Supported formats:
          <span className="font-mono text-[11px]"> .obo, .json</span>.
        </p>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="
            inline-flex items-center gap-1.5
            rounded-lg px-3 py-1.5
            text-xs font-medium transition
            border border-black/10 bg-black/4 text-gray-700 hover:bg-black/8
            dark:border-transparent dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10
          "
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onSelectFile}
          className="
            inline-flex items-center gap-1.5
            rounded-lg px-3 py-1.5
            text-xs font-medium
            bg-blue-600/90 text-white
            hover:bg-blue-500
            transition
          "
        >
          <FolderOpen size={14} />
          Choose file…
        </button>
      </div>
    </div>
  );
};

export default FileTab;

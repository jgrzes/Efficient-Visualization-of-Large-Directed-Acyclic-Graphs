// LoadGraphModal.tsx
import React, { useEffect, useState } from "react";
import { X, Download, AlertTriangle } from "lucide-react";

interface LoadGraphModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (hash: string) => void;
  loading?: boolean;
  error?: string | null;
  initialHash?: string;
}

const LoadGraphModal: React.FC<LoadGraphModalProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  error,
  initialHash = "",
}) => {
  const [hash, setHash] = useState(initialHash);

  useEffect(() => {
    if (open) {
      setHash(initialHash);
    }
  }, [open, initialHash]);

  if (!open) return null;

  const canSubmit = hash.trim().length > 0 && !loading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(hash.trim());
  };

  return (
    <div
      className="
        fixed inset-0 z-[1000]
        flex items-center justify-center
        bg-black/70 backdrop-blur-sm
      "
      aria-modal="true"
      role="dialog"
    >
      <div
        className="
          relative w-[min(92vw,460px)]
          rounded-2xl border border-white/10
          bg-[#050507]/95
          shadow-2xl shadow-black/80
          text-gray-100
          overflow-hidden
        "
      >
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={onClose}
          className="
            absolute right-3 top-3 z-20
            inline-flex h-8 w-8 items-center justify-center
            rounded-full bg-white/5 text-gray-400
            hover:bg-white/10 hover:text-white transition
          "
        >
          <X size={18} />
        </button>

        {/* CONTENT */}
        <form onSubmit={handleSubmit} className="px-5 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
              <Download size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-white">
                Load graph by hash
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                Paste a valid graph hash to load a saved graph and restore its layout.
              </p>

              {/* HASH FIELD */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-3">
                  {/* Label */}
                  <span className="w-12 text-[11px] uppercase tracking-wide text-gray-500">
                    Hash
                  </span>

                  {/* Input */}
                  <input
                    type="text"
                    value={hash}
                    onChange={(e) => setHash(e.target.value)}
                    placeholder="e.g. 3f9a2c7b..."
                    className="
                      flex-1 rounded-lg
                      bg-black/60 border border-white/10
                      px-2.5 py-1.5
                      text-[11px] font-mono text-gray-200
                      outline-none
                      focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60
                    "
                  />
                </div>

                {/* ERROR */}
                {error && (
                  <div className="flex items-center gap-1.5 pl-[3.2rem] pt-0.5">
                    <AlertTriangle size={12} className="text-red-400" />
                    <p className="text-[11px] text-red-400 break-words">
                      {error}
                    </p>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`
                    inline-flex items-center gap-1.5
                    rounded-lg px-3 py-1.5
                    text-xs font-medium
                    transition
                    ${
                      canSubmit
                        ? "bg-blue-600/90 text-white hover:bg-blue-500"
                        : "bg-blue-600/40 text-gray-200/60 cursor-not-allowed"
                    }
                  `}
                >
                  <Download size={14} />
                  {loading ? "Loading..." : "Load graph"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoadGraphModal;

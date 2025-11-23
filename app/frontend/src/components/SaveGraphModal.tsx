// SaveGraphModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, X, Copy, AlertTriangle } from "lucide-react";

interface SaveGraphModalProps {
  open: boolean;
  onClose: () => void;
  hash?: string | null;
  error?: string | null;
}

const SaveGraphModal: React.FC<SaveGraphModalProps> = ({
  open,
  onClose,
  hash,
  error,
}) => {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  const isError = Boolean(error);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
    } catch {
      // jeśli chcesz, możesz kiedyś dodać osobny komunikat o błędzie
    }

    setCopied(true);
    if (copiedTimeoutRef.current) {
      window.clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-[1000]
        flex items-center justify-center
        bg-black/10 backdrop-blur-sm
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
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* CONTENT */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div
              className={[
                "mt-1 flex h-9 w-9 items-center justify-center rounded-full",
                isError
                  ? "bg-red-500/20 text-red-300"
                  : "bg-emerald-500/20 text-emerald-300",
              ].join(" ")}
            >
              {isError ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-white">
                {isError ? "Saving failed" : "Graph saved successfully"}
              </h2>

              {!isError && (
                <>
                  <p className="mt-1 text-xs text-gray-400">
                    Your graph was saved successfully. Below is a unique hash you can
                    use to restore this graph later.
                  </p>

                  {/* HASH FIELD */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-[11px] uppercase tracking-wide text-gray-500">
                        Hash
                      </span>

                      {/* Input + Copy button */}
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          readOnly
                          value={hash ?? ""}
                          className="
                            flex-1 rounded-lg
                            bg-black/60 border border-white/10
                            px-2.5 py-1.5
                            text-[11px] font-mono text-gray-200
                            outline-none
                          "
                        />
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="
                            inline-flex items-center gap-1.5
                            rounded-lg bg-blue-600/90
                            px-2.5 py-1.5
                            text-[11px] font-medium text-white
                            hover:bg-blue-500 transition
                          "
                        >
                          <Copy size={14} />
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Copied indicator */}
                    <span
                      role="status"
                      aria-live="polite"
                      className={`
                        block text-[11px] text-green-400 font-medium
                        select-none flex justify-end mr-3
                        transition-opacity duration-200
                        ${copied ? "opacity-100" : "opacity-0"}
                      `}
                    >
                      Copied!
                    </span>
                  </div>
                </>
              )}

              {isError && (
                <p className="mt-2 text-xs text-red-400 break-words">{error}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveGraphModal;

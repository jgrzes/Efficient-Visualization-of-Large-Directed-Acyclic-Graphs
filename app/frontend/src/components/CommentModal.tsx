import React, { useEffect, useRef, useState } from "react";

interface CommentModalProps {
  open: boolean;
  title?: string;
  initialText?: string;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

const CommentModal: React.FC<CommentModalProps> = ({
  open,
  title = "Dodaj komentarz",
  initialText = "",
  onClose,
  onSubmit,
}) => {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      // focus textarea po otwarciu
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [open, initialText]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="comment-modal-title"
    >
      {/* backdrop */}
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Zamknij"
        onClick={onClose}
      />

      {/* modal */}
      <div className="relative z-[1001] w-[min(92vw,560px)] rounded-xl border border-white/10 bg-[#0b0b0b] shadow-2xl">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 id="comment-modal-title" className="text-sm font-semibold text-gray-100">
            {title}
          </h2>
        </div>

        <div className="p-4">
          <label htmlFor="comment-textarea" className="sr-only">
            Treść komentarza
          </label>
          <textarea
            id="comment-textarea"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Wpisz komentarz…"
          />
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-md border border-white/10 text-gray-300 hover:bg-white/[0.06] transition"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => {
              const trimmed = text.trim();
              if (!trimmed) return;
              onSubmit(trimmed);
            }}
            disabled={!text.trim()}
            className={`px-3 py-2 text-sm rounded-md transition ${
              text.trim()
                ? "bg-blue-500/90 text-white hover:bg-blue-500"
                : "bg-white/[0.06] text-gray-400 cursor-not-allowed"
            }`}
          >
            Zapisz komentarz
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;

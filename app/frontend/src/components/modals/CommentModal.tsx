import React, { useEffect, useRef, useState } from "react";

interface CommentModalProps {
  open: boolean;
  title?: string;
  initialText?: string;
  initialName?: string;
  onClose: () => void;
  onSubmit: (data: { name: string; text: string }) => void;
}

const CommentModal: React.FC<CommentModalProps> = ({
  open,
  title = "Add comment",
  initialText = "",
  initialName = "",
  onClose,
  onSubmit,
}) => {
  const [text, setText] = useState(initialText);
  const [name, setName] = useState(initialName);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setName(initialName);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [open, initialText, initialName]);

  if (!open) return null;

  const isValid = text.trim() && name.trim();

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="comment-modal-title"
    >
      {/* backdrop */}
      <button
        className="absolute inset-0 bg-black/30 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />

      {/* modal */}
      <div
        className="
          relative z-1001 w-[min(92vw,560px)] rounded-xl border shadow-2xl
          border-black/10 bg-white/95
          dark:border-white/10 dark:bg-[#0b0b0b]
        "
      >
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
          <h2
            id="comment-modal-title"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            {title}
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {/* COMMENT NAME / TITLE FIELD */}
          <div>
            <label htmlFor="comment-name" className="text-sm text-gray-700 dark:text-gray-300">
              Comment title
            </label>
            <input
              id="comment-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="
                mt-1 w-full rounded-lg border p-3 text-sm
                bg-white text-gray-900 placeholder:text-gray-400
                border-black/10 focus:outline-none focus:ring-2 focus:ring-blue-300

                dark:border-white/10 dark:bg-white/3 dark:text-gray-100 dark:placeholder:text-gray-500
                dark:focus:ring-white/20
              "
              placeholder='For example, "Note on definition"'
            />
          </div>

          {/* COMMENT TEXTAREA */}
          <div>
            <label htmlFor="comment-textarea" className="sr-only">
              Comment content
            </label>
            <textarea
              id="comment-textarea"
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="
                w-full resize-y rounded-lg border p-3 text-sm
                bg-white text-gray-900 placeholder:text-gray-400
                border-black/10 focus:outline-none focus:ring-2 focus:ring-blue-300

                dark:border-white/10 dark:bg-white/3 dark:text-gray-100 dark:placeholder:text-gray-500
                dark:focus:ring-white/20
              "
              placeholder="Enter comment text…"
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="
              px-3 py-2 text-sm rounded-md border transition
              border-black/10 text-gray-700 hover:bg-black/4
              dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/6
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isValid) return;

              onSubmit({
                name: name.trim(),
                text: text.trim(),
              });
            }}
            disabled={!isValid}
            className={`px-3 py-2 text-sm rounded-md transition ${
              isValid
                ? "bg-blue-500/90 text-white hover:bg-blue-500"
                : "bg-black/4 text-gray-400 cursor-not-allowed dark:bg-white/6 dark:text-gray-400"
            }`}
          >
            Save comment
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;

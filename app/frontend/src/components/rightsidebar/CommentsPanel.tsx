// app/frontend/src/components/right/CommentsPanel.tsx
import React, { useState } from "react";
import { Trash2, Edit2, Save, X } from "lucide-react";
import { useComments } from "../../hooks/useComments";

const formatTime = (ts: number) => {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
};

const CommentsPanel: React.FC = () => {
  const { getAllSorted, removeComment, editComment } = useComments();
  const comments = getAllSorted();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");

  const startEditing = (id: string, currentText: string) => {
    setEditingId(id);
    setEditedText(currentText);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedText("");
  };

  const saveEdit = async (id: string) => {
    if (!editedText.trim()) return;
    await editComment(id, editedText);
    cancelEditing();
  };

  if (!comments.length) {
    return (
      <div className="text-sm text-gray-300">
        <p className="mb-2 text-gray-400 uppercase tracking-wide text-xs">
          Komentarze
        </p>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-gray-400">Brak komentarzy.</p>
          <p className="text-gray-500 text-xs mt-1">
            Dodaj pierwszy komentarz z panelu wyszukiwania lub panelu informacji o węźle.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-300">
      <p className="mb-2 text-gray-400 uppercase tracking-wide text-xs">
        Komentarze
      </p>

      <ul className="space-y-3">
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* Tytuł komentarza + węzeł */}
                <div className="text-xs text-gray-400">
                  <span className="font-medium text-gray-300">
                    {c.title}
                  </span>
                  <span className="mx-1 text-gray-600">·</span>
                  <span className="text-gray-500">{c.nodeName}</span>
                  {c.namespace ? (
                    <span className="text-gray-600"> · {c.namespace}</span>
                  ) : null}
                </div>

                {/* Czas */}
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {formatTime(c.createdAt)}
                  {c.updatedAt && (
                    <span className="ml-1 text-gray-500">(edytowano)</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* edycja */}
                {editingId !== c.id && (
                  <button
                    className="p-1.5 rounded-md text-gray-400 hover:text-blue-400 hover:bg-blue-400/10
                               focus:outline-none focus:ring-2 focus:ring-blue-700"
                    onClick={() => startEditing(c.id, c.text)}
                  >
                    <Edit2 size={16} />
                  </button>
                )}

                {/* usuwanie */}
                <button
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-400/10
                             focus:outline-none focus:ring-2 focus:ring-red-700"
                  onClick={() => removeComment(c.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* treść lub edycja */}
            {editingId === c.id ? (
              <div className="mt-2">
                <textarea
                  className="w-full rounded-md bg-gray-800/40 text-gray-100 text-sm p-2 border border-white/10 focus:ring-2 focus:ring-blue-600"
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="mt-2 flex gap-2 justify-end">
                  <button
                    className="flex items-center gap-1 px-3 py-1 rounded-md bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                    onClick={() => saveEdit(c.id)}
                  >
                    <Save size={14} /> Zapisz
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-500/20 text-gray-300 hover:bg-gray-500/30"
                    onClick={cancelEditing}
                  >
                    <X size={14} /> Anuluj
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-gray-200 whitespace-pre-wrap break-words">
                {c.text}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CommentsPanel;

import React, { useState } from "react";
import { Trash2, Edit2, Save, X } from "lucide-react";
import { useComments } from "../../hooks/useComments";
import { NodeInfoProps } from "../leftsidebar/NodeInfo";

const formatTime = (ts: number) => {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
};

interface CommentsPanelProps {
  onSelectNode: (node: NodeInfoProps) => void;
  onHoverResultCard?: (node?: NodeInfoProps) => void;
  nodeNames?: string[] | null;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({
  onSelectNode,
  onHoverResultCard,
  nodeNames,
}) => {
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
    editComment(id, editedText);
    cancelEditing();
  };

  if (!comments.length) {
    return (
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <p className="mb-2 text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs">
          Comments
        </p>
        <div className="rounded-xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/3">
          <p className="text-gray-600 dark:text-gray-400">No comments.</p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
            Add the first comment from the search panel or the node info panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-700 dark:text-gray-300">
      <p className="mb-2 text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs">
        Comments
      </p>

      <ul className="space-y-3">
        {comments.map((c) => {
          const index = c.nodeIndex;
          const node: NodeInfoProps = {
            index,
            name: nodeNames?.[index] ?? c.nodeName ?? `Node ${index}`,
          };

          const handleClickNode = () => {
            if (index === undefined || index === null) return;
            onSelectNode(node);
          };

          const handleMouseEnter = () => {
            if (!onHoverResultCard) return;
            onHoverResultCard(node);
          };

          const handleMouseLeave = () => {
            onHoverResultCard?.(undefined);
          };

          return (
            <li
              key={c.id}
              className="
                rounded-xl border p-3
                transition-colors duration-150

                border-black/10 bg-white/70
                hover:bg-white hover:border-black/20

                dark:border-white/10 dark:bg-white/3
                dark:hover:bg-white/10 dark:hover:border-white/30
              "
              onClick={handleClickNode}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {/* Title + node */}
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-900 dark:text-gray-300">
                      {c.title}
                    </span>
                    <span className="mx-1 text-gray-400 dark:text-gray-600">·</span>
                    <span className="text-gray-500 dark:text-gray-500">{node.name}</span>
                  </div>

                  {/* Time */}
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {formatTime(c.createdAt)}
                    {c.updatedAt && (
                      <span className="ml-1 text-gray-500">(edited)</span>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* edit */}
                  {editingId !== c.id && (
                    <button
                      className="
                        p-1.5 rounded-md transition
                        text-gray-500 hover:text-blue-700 hover:bg-blue-600/10
                        focus:outline-none focus:ring-2 focus:ring-blue-300

                        dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-400/10
                        dark:focus:ring-blue-700
                      "
                      onClick={() => startEditing(c.id, c.text)}
                      aria-label="Edit comment"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}

                  {/* delete */}
                  <button
                    className="
                      p-1.5 rounded-md transition
                      text-gray-500 hover:text-red-700 hover:bg-red-600/10
                      focus:outline-none focus:ring-2 focus:ring-red-300

                      dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-400/10
                      dark:focus:ring-red-700
                    "
                    onClick={() => {
                      removeComment(c.id);
                      onHoverResultCard?.(undefined);
                    }}
                    aria-label="Delete comment"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* content or edit */}
              {editingId === c.id ? (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    className="
                      w-full rounded-md text-sm p-2 border
                      focus:outline-none focus:ring-2

                      bg-white text-gray-900 border-black/10
                      focus:ring-blue-300

                      dark:bg-gray-800/40 dark:text-gray-100 dark:border-white/10
                      dark:focus:ring-blue-600
                    "
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={3}
                    autoFocus
                  />

                  <div className="mt-2 flex gap-2 justify-end">
                    <button
                      className="
                        flex items-center gap-1 px-3 py-1 rounded-md transition

                        bg-blue-600/10 text-blue-800 hover:bg-blue-600/15
                        dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30
                      "
                      onClick={() => saveEdit(c.id)}
                    >
                      <Save size={14} /> Save
                    </button>

                    <button
                      className="
                        flex items-center gap-1 px-3 py-1 rounded-md transition

                        bg-black/5 text-gray-700 hover:bg-black/10
                        dark:bg-gray-500/20 dark:text-gray-300 dark:hover:bg-gray-500/30
                      "
                      onClick={cancelEditing}
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-gray-800 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
                  {c.text}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CommentsPanel;

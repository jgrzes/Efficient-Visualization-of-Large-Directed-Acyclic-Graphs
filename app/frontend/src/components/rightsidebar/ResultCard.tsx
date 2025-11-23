import React, { useState, useCallback } from "react";
import { Star, MessageCirclePlus } from "lucide-react";
import { NodeInfoProps } from "../leftsidebar/NodeInfo";
import { useFavorites } from "../../hooks/useFavorites";
import { useComments } from "../../hooks/useComments";
import CommentModal from "../CommentModal";

export interface ResultCardProps {
  node: NodeInfoProps;
  onSelect: (n: NodeInfoProps) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ node, onSelect }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addComment } = useComments();

  const isFav = isFavorite(node.id);
  const [commentOpen, setCommentOpen] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(node);
  };

  const openComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentOpen(true);
  };

  const handleSubmitComment = useCallback(
    (data: { name: string; text: string }) => {
      setCommentOpen(false);
      addComment(
        { id: node.id, name: node.name, namespace: node.namespace },
        data
      );
    },
    [addComment, node.id, node.name, node.namespace]
  );

  return (
    <>
      <li
        onClick={() => onSelect(node)}
        className="group rounded-xl p-3 border border-gray-900/60 bg-white/[0.03]
                   hover:bg-white/[0.06] hover:border-gray-700 transition cursor-pointer
                   shadow-sm hover:shadow-md w-[17em] max-w-full"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Tekst */}
          <div className="min-w-0 flex-1">
            <p
              className="font-semibold text-gray-100 text-sm leading-tight line-clamp-2"
              title={node.name}
            >
              {node.name}
            </p>

            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
              {node.namespace || node.id}
            </p>
          </div>

          {/* Akcje */}
          <div className="flex items-center gap-1.5">
            {/* Dodaj komentarz */}
            <button
              onClick={openComment}
              className="p-1.5 rounded-lg transition shrink-0
                         text-gray-400 hover:text-blue-400 hover:bg-blue-400/10
                         focus:outline-none focus:ring-2 focus:ring-blue-700"
              aria-label="Add comment"
              title="Add comment"
            >
              <MessageCirclePlus size={18} className="block" />
            </button>

            {/* Ulubione */}
            <button
              onClick={handleToggle}
              className={`p-1.5 rounded-lg transition shrink-0
                          focus:outline-none focus:ring-2 focus:ring-gray-700
                          ${
                            isFav
                              ? "text-yellow-400 hover:bg-yellow-400/10"
                              : "text-gray-400 hover:bg-gray-800/80 group-hover:text-gray-200"
                          }`}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              title={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                size={18}
                className="block"
                fill={isFav ? "currentColor" : "none"}
                stroke="currentColor"
              />
            </button>
          </div>
        </div>
      </li>

      {/* Modal dodawania komentarza */}
      <CommentModal
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        onSubmit={handleSubmitComment}
  title={`Comment for: ${node.name}`}
        // jeśli masz jakieś domyślne imię użytkownika, możesz dodać:
        // initialName={defaultAuthorName}
      />
    </>
  );
};

export default React.memo(ResultCard);

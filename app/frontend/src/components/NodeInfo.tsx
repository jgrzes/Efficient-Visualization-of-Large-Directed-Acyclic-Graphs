import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Star, MessageCirclePlus } from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";
import { useComments } from "../hooks/useComments";
import CommentModal from "./CommentModal";

export interface NodeInfoProps {
  index: number;
  id: string;
  name: string;
  namespace: string;
  def: string;
  synonym?: string[];
  is_a?: string[];
  isFavorite?: boolean;                 // opcjonalny hint z rodzica/backendu
  onToggleFavorite?: (node: NodeInfoProps) => void; // legacy (opcjonalne)
  onAddComment?: (node: NodeInfoProps, text: string) => void; // callback do zapisu komentarza
}

function CopyChip({
  text,
  className = "",
  title,
  onCopied,
}: {
  text: string;
  className?: string;
  title?: string;
  onCopied: () => void;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onCopied();
    } catch {
      /* no-op */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center max-w-full truncate px-2 py-0.5 rounded-md
                  border border-gray-800 bg-white/[0.04] text-gray-300
                  hover:bg-white/[0.08] hover:text-gray-100
                  cursor-copy transition focus:outline-none focus:ring-2 focus:ring-gray-700 ${className}`}
      title={(title ?? text) + "  •  Click to copy"}
      aria-label={`Chip: ${text}`}
    >
      <span className="font-mono text-xs truncate">{text}</span>
    </button>
  );
}

const VISIBLE_SYNONYMS = 3;

const NodeInfo: React.FC<NodeInfoProps> = (props) => {
  const { id, name, namespace, def, synonym, is_a, isFavorite: isFavoriteProp, onAddComment } = props;

  const [copied, setCopied] = useState(false);
  const [synExpanded, setSynExpanded] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  // ulubione z globalnego store (Zustand/Context)
  const { isFavorite: isFavHook, toggleFavorite, isLoading, isSaving } = useFavorites();
  const { addComment } = useComments();

  // Fallback: zanim hook się zhydratuje, pokazuj stan z propsa
  const fav = isLoading ? !!isFavoriteProp : isFavHook(id);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const showCopied = () => {
    setCopied(true);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1200);
  };

  const copyDefinition = async () => {
    try {
      await navigator.clipboard.writeText(def);
      showCopied();
    } catch {
      /* no-op */
    }
  };

  const syns = useMemo<string[]>(() => (synonym ?? []).filter(Boolean), [synonym]);
  const hiddenSynCount = Math.max(0, syns.length - VISIBLE_SYNONYMS);
  const shownSynonyms = synExpanded ? syns : syns.slice(0, VISIBLE_SYNONYMS);

  const handleToggleFav = useCallback(async () => {
    await toggleFavorite(props);
    // props.onToggleFavorite?.({ ...props, isFavorite: !fav }); // jeśli chcesz legacy callback
  }, [toggleFavorite, props]);

  const handleAddCommentOpen = useCallback(() => {
    setCommentOpen(true);
  }, []);

  const handleCommentSubmit = useCallback(
    (text: string) => {
      setCommentOpen(false);
      addComment({ id, name, namespace }, text);
      // jeśli chcesz powiadomienie/toast — tutaj
      // opcjonalnie: przełącz prawy panel na "comments" (jeśli masz taki mechanizm w rodzicu)
    },
    [addComment, id, name, namespace]
  );

  return (
    <section
      id="info-panel"
      aria-labelledby="info-title"
      className="relative inline-block w-[800px] max-w-[92vw] bg-black/70 backdrop-blur-md
                 rounded-xl shadow-lg text-gray-200 border border-gray-900/60"
    >
      {/* Copied indicator (a11y) */}
      <span
        role="status"
        aria-live="polite"
        className={`absolute bottom-2 right-3 text-[11px] text-green-400 font-medium
                    select-none transition-opacity duration-200
                    ${copied ? "opacity-100" : "opacity-0"}`}
      >
        Copied!
      </span>

      {/* Header */}
      <header className="flex items-start justify-between gap-3 p-4 border-b border-gray-900/60 cursor-default">
        <div className="min-w-0">
          <CopyChip
            text={name}
            title="Name"
            className="text-2xl sm:text-3xl font-bold truncate px-0 py-0 bg-transparent border-none
                      hover:bg-transparent hover:text-gray-100 cursor-copy leading-tight"
            onCopied={showCopied}
          />
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <CopyChip text={id} title="ID" className="font-mono" onCopied={showCopied} />
            <CopyChip text={namespace} title="Namespace" className="text-[11px]" onCopied={showCopied} />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {/* Favorite */}
          <button
            type="button"
            onClick={handleToggleFav}
            disabled={isSaving}
            className={`shrink-0 p-2 rounded-md transition
                        focus:outline-none focus:ring-2 focus:ring-gray-700
                        ${fav ? "text-yellow-400 hover:bg-yellow-400/10" : "text-gray-300 hover:bg-white/10 hover:text-white"}
                        ${isSaving ? "opacity-60 cursor-not-allowed" : ""}`}
            title={fav ? "Remove from favorites" : "Add to favorites"}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={fav}
            aria-busy={isSaving}
          >
            <Star size={18} className="block" fill={fav ? "currentColor" : "none"} stroke="currentColor" />
          </button>

          {/* Add Comment */}
          <button
            type="button"
            onClick={handleAddCommentOpen}
            className="shrink-0 p-2 rounded-md transition text-gray-300 hover:text-blue-400 hover:bg-blue-400/10
                       focus:outline-none focus:ring-2 focus:ring-blue-700"
            title="Add comment"
            aria-label="Add comment"
          >
            <MessageCirclePlus size={18} className="block" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="p-4 cursor-default">
        <dl className="grid grid-cols-1 gap-4">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Definition</dt>
            <dd
              onClick={copyDefinition}
              className="text-sm whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-1
                         hover:bg-white/[0.02] rounded-md p-1 cursor-copy transition"
              title="Click to copy definition"
            >
              {def}
            </dd>
          </div>

          {/* Synonyms */}
          {syns.length > 0 && (
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Synonyms</dt>
              <dd className={`flex flex-wrap gap-1.5 ${synExpanded ? "max-h-56 overflow-y-auto pr-1" : ""}`}>
                {shownSynonyms.map((s, i) => (
                  <CopyChip key={`${s}-${i}`} text={s} title="Synonym" className="text-xs" onCopied={showCopied} />
                ))}
                {hiddenSynCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSynExpanded((v) => !v)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        setSynExpanded((v) => !v);
                      }
                    }}
                    aria-expanded={synExpanded}
                    className="text-[11px] px-2 py-0.5 rounded-md border border-gray-800
                               bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] transition
                               focus:outline-none focus:ring-2 focus:ring-gray-700"
                    title={synExpanded ? "Show less" : `Show ${hiddenSynCount} more`}
                  >
                    {synExpanded ? "Show less" : `+${hiddenSynCount} more`}
                  </button>
                )}
              </dd>
            </div>
          )}

          {/* is_a */}
          {is_a && is_a.length > 0 && (
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">is_a</dt>
              <dd className="flex flex-wrap gap-1.5">
                {is_a.map((rel, i) => (
                  <CopyChip key={`${rel}-${i}`} text={rel} title="is_a" className="text-xs" onCopied={showCopied} />
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Modal dodawania komentarza */}
      <CommentModal
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        onSubmit={handleCommentSubmit}
        title={`Komentarz do: ${name}`}
      />
    </section>
  );
};

export default NodeInfo;

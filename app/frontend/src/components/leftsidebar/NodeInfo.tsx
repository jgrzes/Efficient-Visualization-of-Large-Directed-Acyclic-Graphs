import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Star, MessageCirclePlus } from "lucide-react";
import { useFavorites } from "../../hooks/useFavorites";
import { useComments } from "../../hooks/useComments";
import CommentModal from "../CommentModal";
import CopyChip from "./CopyChip";
import FieldRow from "./FieldRow";

export interface NodeInfoProps {
  index: number;
  id: string;
  name: string;
  namespace: string;
  def: string;
  synonym?: string[];
  is_a?: string[];
  isFavorite?: boolean;
  onToggleFavorite?: (node: NodeInfoProps) => void;
  onAddComment?: (node: NodeInfoProps, data: { name: string; text: string }) => void;
}

const VISIBLE_SYNONYMS = 3;

const NodeInfo: React.FC<NodeInfoProps> = (props) => {
  const {
    id,
    name,
    namespace,
    def,
    synonym,
    is_a,
    isFavorite: isFavoriteProp,
    onAddComment,
  } = props;

  const [copied, setCopied] = useState(false);
  const [synExpanded, setSynExpanded] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  const { isFavorite: isFavHook, toggleFavorite, isLoading, isSaving } =
    useFavorites();
  const { addComment } = useComments();

  const fav = isLoading ? !!isFavoriteProp : isFavHook(id);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
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
      // no-op
    }
  };

  const syns = useMemo<string[]>(() => (synonym ?? []).filter(Boolean), [synonym]);
  const hiddenSynCount = Math.max(0, syns.length - VISIBLE_SYNONYMS);
  const shownSynonyms = synExpanded ? syns : syns.slice(0, VISIBLE_SYNONYMS);

  const handleToggleFav = useCallback(async () => {
    await toggleFavorite(props);
  }, [toggleFavorite, props]);

  const handleAddCommentOpen = useCallback(() => {
    setCommentOpen(true);
  }, []);

  const handleCommentSubmit = useCallback(
    (data: { name: string; text: string }) => {
      setCommentOpen(false);
      addComment({ id, name, namespace }, data);
      onAddComment?.(props, data);
    },
    [addComment, id, name, namespace, onAddComment, props]
  );

  return (
    <section
      id="info-panel"
      aria-labelledby="info-title"
      className="relative inline-block w-[400px] max-w-[92vw] bg-black/70 backdrop-blur-md
                 rounded-xl shadow-lg text-gray-200 border border-gray-900/60"
    >
      {/* Copied indicator */}
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
          {/* Name */}
          <CopyChip
            text={name}
            title="Name"
            className="text-3xl sm:text-xl font-bold px-0 py-0 bg-transparent border-none
                       hover:bg-transparent hover:text-gray-100 cursor-copy leading-tight"
            onCopied={showCopied}
            mono={false}
          />

          {/* ID + Namespace */}
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <CopyChip
              text={id}
              title="ID"
              className="font-mono"
              onCopied={showCopied}
            />
            <CopyChip
              text={namespace}
              title="Namespace"
              className="text-[11px]"
              onCopied={showCopied}
              mono={false}
            />
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
                        ${
                          fav
                            ? "text-yellow-400 hover:bg-yellow-400/10"
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        }
                        ${isSaving ? "opacity-60 cursor-not-allowed" : ""}`}
            title={fav ? "Remove from favorites" : "Add to favorites"}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={fav}
            aria-busy={isSaving}
          >
            <Star
              size={18}
              className="block"
              fill={fav ? "currentColor" : "none"}
              stroke="currentColor"
            />
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
          {/* Definition */}
          <FieldRow label="Definition">
            <div
              onClick={copyDefinition}
              className="text-sm whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-1
                         hover:bg-white/[0.02] rounded-md p-1 cursor-copy transition"
              title="Click to copy definition"
            >
              {def}
            </div>
          </FieldRow>

          {/* Synonyms */}
          {syns.length > 0 && (
            <FieldRow label="Synonyms">
              <div
                className={`flex flex-wrap gap-1.5 ${
                  synExpanded ? "max-h-56 overflow-y-auto pr-1" : ""
                }`}
              >
                {shownSynonyms.map((s, i) => (
                  <CopyChip
                    key={`${s}-${i}`}
                    text={s}
                    title="Synonym"
                    className="text-xs"
                    onCopied={showCopied}
                    mono={false}
                  />
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
              </div>
            </FieldRow>
          )}

          {/* is_a */}
          {is_a && is_a.length > 0 && (
            <FieldRow label="is_a">
              <div className="flex flex-wrap gap-1.5">
                {is_a.map((rel, i) => (
                  <CopyChip
                    key={`${rel}-${i}`}
                    text={rel}
                    title="is_a"
                    className="text-xs"
                    onCopied={showCopied}
                    mono={false}
                  />
                ))}
              </div>
            </FieldRow>
          )}
        </dl>
      </div>

      {/* Add Comment Modal */}
      <CommentModal
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        onSubmit={handleCommentSubmit}
  title={`Comment for: ${name}`}
      />
    </section>
  );
};

export default NodeInfo;

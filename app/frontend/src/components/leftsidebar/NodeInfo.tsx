import React, { useState, useEffect, useRef, useCallback } from "react";
import { Star, MessageCirclePlus } from "lucide-react";
import { useFavorites } from "../../hooks/useFavorites";
import { useComments } from "../../hooks/useComments";
import CommentModal from "../modals/CommentModal";
import CopyChip from "./CopyChip";
import FieldRow from "./FieldRow";

export interface NodeInfoProps {
  name: string;
  index?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (node: NodeInfoProps) => void;
  onAddComment?: (node: NodeInfoProps, data: { name: string; text: string }) => void;
  [key: string]: any;
}

const NodeInfo: React.FC<NodeInfoProps> = (props) => {
  const { name, isFavorite: isFavoriteProp, onAddComment, onToggleFavorite, ...rawProps } =
    props;

  const nodeIndex = rawProps.index as number | undefined;

  const [copied, setCopied] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  const { isFavorite: isFavHook, toggleFavorite, isLoading, isSaving } = useFavorites();
  const { addComment } = useComments();

  const fav =
    nodeIndex !== undefined ? isFavHook(nodeIndex) : isLoading ? !!isFavoriteProp : false;

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

  const handleToggleFav = useCallback(() => {
    if (nodeIndex === undefined) return;
    toggleFavorite(nodeIndex);
    onToggleFavorite?.(props);
  }, [toggleFavorite, nodeIndex, onToggleFavorite, props]);

  const handleAddCommentOpen = useCallback(() => {
    setCommentOpen(true);
  }, []);

  const handleCommentSubmit = useCallback(
    (data: { name: string; text: string }) => {
      setCommentOpen(false);

      if (nodeIndex !== undefined) {
        addComment(
          {
            index: nodeIndex,
            name,
          },
          data
        );
      }
      onAddComment?.(props, data);
    },
    [addComment, nodeIndex, name, onAddComment, props]
  );

  const HIDDEN_KEYS = new Set([
    // keys that we receive but don't want to show
    "index",
  ]);

  const renderValue = (key: string, value: any) => {
    if (value == null) return null;

    // for long strings -> scrollable div with copy on click
    if (typeof value === "string") {
      const isLong = value.length > 20;

      if (isLong) {
        return (
          <div
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value);
                showCopied();
              } catch {
                // ignore
              }
            }}
            className="
              text-sm whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-1
              rounded-md p-1 cursor-copy transition
              hover:bg-black/4
              dark:hover:bg-white/2
            "
            title="Click to copy"
          >
            {value}
          </div>
        );
      }

      // short text -> chip
      return (
        <CopyChip
          text={value}
          title={key}
          className="text-xs"
          onCopied={showCopied}
          mono={false}
        />
      );
    }

    // arrays -> chip per element
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-xs text-gray-500 dark:text-gray-400 overflow-y-auto">[]</span>;
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <CopyChip
              key={i}
              text={typeof v === "string" ? v : JSON.stringify(v)}
              title={key}
              className="text-xs"
              onCopied={showCopied}
              mono={false}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  const fields = Object.entries(rawProps)
    .filter(([key, value]) => !HIDDEN_KEYS.has(key) && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <section
      id="info-panel"
      aria-labelledby="info-title"
      className="
        relative inline-block w-100 max-w-[92vw]
        rounded-xl shadow-lg backdrop-blur-md

        bg-white/80 border border-black/10 text-gray-900
        dark:bg-black/70 dark:border-gray-900/60 dark:text-gray-200
      "
    >
      <span
        role="status"
        aria-live="polite"
        className={`
          fixed bottom-4 right-4 z-50
          text-[11px] font-medium
          px-3 py-1 rounded-full shadow-lg select-none
          transition-opacity duration-200 pointer-events-none
          bg-white/90 text-emerald-700 border border-emerald-500/20
          dark:bg-black/80 dark:text-green-400 dark:border-transparent
          ${copied ? "opacity-100" : "opacity-0"}
        `}
      >
        Copied!
      </span>

      <header
        className="
          flex items-start justify-between gap-3 p-4 cursor-default
          border-b border-black/10
          dark:border-gray-900/60
        "
      >
        <div className="min-w-0 text-left">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Name
          </div>
          <CopyChip
            text={name}
            title="Name"
            className="
              text-3xl sm:text-xl font-bold px-0 py-0 bg-transparent border-none
              hover:bg-transparent cursor-copy leading-tight
              text-gray-900 hover:text-gray-950
              dark:text-gray-300 dark:hover:text-gray-100
            "
            onCopied={showCopied}
            mono={false}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFav}
            disabled={isSaving || nodeIndex === undefined}
            className={`
              shrink-0 p-2 rounded-md transition
              focus:outline-none focus:ring-2
              focus:ring-black/20
              dark:focus:ring-gray-700
              ${
                fav
                  ? "text-yellow-600 hover:bg-yellow-600/10"
                  : "text-gray-700 hover:bg-black/5 hover:text-gray-950"
              }
              ${
                fav
                  ? "dark:text-yellow-400 dark:hover:bg-yellow-400/10"
                  : "dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
              }
              ${isSaving || nodeIndex === undefined ? "opacity-60 cursor-not-allowed" : ""}
            `}
            title={fav ? "Remove from favorites" : "Add to favorites"}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={fav}
            aria-busy={isSaving}
          >
            <Star size={18} className="block" fill={fav ? "currentColor" : "none"} stroke="currentColor" />
          </button>

          <button
            type="button"
            onClick={handleAddCommentOpen}
            className="
              shrink-0 p-2 rounded-md transition
              focus:outline-none focus:ring-2

              text-gray-700 hover:text-blue-700 hover:bg-blue-600/10 focus:ring-blue-300
              dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-400/10 dark:focus:ring-blue-700
            "
            title="Add comment"
            aria-label="Add comment"
          >
            <MessageCirclePlus size={18} className="block" />
          </button>
        </div>
      </header>

      <div className="p-4 cursor-default">
        <dl className="grid grid-cols-1 gap-4">
          {fields.map(([key, value]) => (
            <FieldRow key={key} label={key}>
              {renderValue(key, value)}
            </FieldRow>
          ))}
        </dl>
      </div>

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

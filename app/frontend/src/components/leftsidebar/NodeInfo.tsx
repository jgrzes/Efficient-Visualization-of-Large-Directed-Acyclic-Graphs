import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Star, MessageCirclePlus, ChevronDown, ChevronUp } from "lucide-react";
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

const clampText = (s: string, max: number) => {
  if (s.length <= max) return s;
  return s.slice(0, max).trimEnd() + "…";
};

const HIDDEN_KEYS = new Set(["index", "compact", "compactFieldsLimit"]);

const NodeInfo: React.FC<NodeInfoProps> = (props) => {
  const {
    name,
    isFavorite: isFavoriteProp,
    onAddComment,
    onToggleFavorite,
    compact = false,
    compactFieldsLimit = 6,
    ...rawProps
  } = props;

  const nodeIndex = rawProps.index as number | undefined;

  const [copied, setCopied] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [showAll, setShowAll] = useState(!compact);
  const copiedTimerRef = useRef<number | null>(null);

  const { isFavorite: isFavHook, toggleFavorite, isLoading, isSaving } = useFavorites();
  const { addComment } = useComments();

  const fav =
    nodeIndex !== undefined ? isFavHook(nodeIndex) : isLoading ? !!isFavoriteProp : false;

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const showCopiedToast = () => {
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
        addComment({ index: nodeIndex, name }, data);
      }
      onAddComment?.(props, data);
    },
    [addComment, nodeIndex, name, onAddComment, props]
  );

  const compactView = compact && !showAll;

  const renderValue = (key: string, value: any) => {
    if (value == null) return null;

    if (typeof value === "string") {
      const isLong = value.length > 20;

      if (isLong) {
        const preview = compactView ? clampText(value, 110) : value;

        return (
          <div
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value);
                showCopiedToast();
              } catch {
                // ignore
              }
            }}
            className="
              text-sm whitespace-pre-wrap leading-relaxed
              rounded-md p-2 cursor-copy transition
              hover:bg-black/5
              dark:hover:bg-white/5
            "
            title="Click to copy"
          >
            <div className={compactView ? "" : "max-h-60 overflow-y-auto pr-1"}>
              {preview}
            </div>

            {compactView && value.length > preview.length && (
              <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">
                (click to copy full)
              </span>
            )}
          </div>
        );
      }

      return (
        <CopyChip
          text={value}
          title={key}
          className="text-xs"
          onCopied={showCopiedToast}
          mono={false}
        />
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-xs text-gray-500 dark:text-gray-400">[]</span>;
      }

      const shown = compactView ? value.slice(0, 3) : value;
      const rest = value.length - shown.length;

      return (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((v, i) => (
            <CopyChip
              key={i}
              text={typeof v === "string" ? v : JSON.stringify(v)}
              title={key}
              className="text-xs"
              onCopied={showCopiedToast}
              mono={false}
            />
          ))}
          {compactView && rest > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">+{rest}</span>
          )}
        </div>
      );
    }

    try {
      const s = JSON.stringify(value);
      return (
        <CopyChip
          text={compactView ? clampText(s, 110) : s}
          title={key}
          className="text-xs"
          onCopied={showCopiedToast}
          mono
        />
      );
    } catch {
      return null;
    }
  };

  const allFields = useMemo(() => {
    return Object.entries(rawProps)
      .filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [rawProps]);

  const compactFields = useMemo(() => {
    return allFields.slice(0, Math.max(0, compactFieldsLimit));
  }, [allFields, compactFieldsLimit]);

  const fieldsToRender = showAll ? allFields : compactFields;
  const canExpand = compact && allFields.length > compactFields.length;

  return (
    <section
      id="info-panel"
      aria-labelledby="info-title"
      className="
        relative w-full min-w-0
        rounded-xl shadow-lg backdrop-blur-md
        bg-white/80 border border-black/10 text-gray-900
        dark:bg-black/70 dark:border-white/10 dark:text-gray-200
      "
    >
      {/* Copied toast inside panel */}
      <span
        role="status"
        aria-live="polite"
        className={`
          absolute bottom-3 right-3 z-20
          text-[11px] font-medium
          px-3 py-1 rounded-full shadow-lg select-none
          transition-opacity duration-200 pointer-events-none
          bg-white/95 text-emerald-700 border border-emerald-500/20
          dark:bg-black/80 dark:text-green-400 dark:border-white/10
          ${copied ? "opacity-100" : "opacity-0"}
        `}
      >
        Copied!
      </span>

      <header
        className={[
          "flex items-start justify-between gap-3",
          "border-b border-black/10 dark:border-white/10",
          compactView ? "p-3" : "p-4",
        ].join(" ")}
      >
        <div className="min-w-0 text-left">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Name
          </div>

          <CopyChip
            text={name}
            title="Name"
            className={[
              "px-0 py-0 bg-transparent border-none hover:bg-transparent cursor-copy leading-tight",
              "text-gray-900 hover:text-gray-950 dark:text-gray-200 dark:hover:text-white",
              compactView ? "text-base font-semibold line-clamp-2" : "text-xl sm:text-2xl font-bold",
            ].join(" ")}
            onCopied={showCopiedToast}
            mono={false}
          />

          {/* Meta row */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {compact && !showAll && canExpand && (
              <span className="text-gray-500 dark:text-gray-500">
                showing {compactFields.length}/{allFields.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFav}
            disabled={isSaving || nodeIndex === undefined}
            className={`
              shrink-0 ${compactView ? "p-1.5" : "p-2"} rounded-md transition
              focus:outline-none focus:ring-2
              focus:ring-black/20 dark:focus:ring-white/20
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
            <Star
              size={compactView ? 16 : 18}
              className="block"
              fill={fav ? "currentColor" : "none"}
              stroke="currentColor"
            />
          </button>

          <button
            type="button"
            onClick={handleAddCommentOpen}
            className={`
              shrink-0 ${compactView ? "p-1.5" : "p-2"} rounded-md transition
              focus:outline-none focus:ring-2
              text-gray-700 hover:text-blue-700 hover:bg-blue-600/10 focus:ring-blue-300
              dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-400/10 dark:focus:ring-blue-700
            `}
            title="Add comment"
            aria-label="Add comment"
          >
            <MessageCirclePlus size={compactView ? 16 : 18} className="block" />
          </button>
        </div>
      </header>

      <div className={compactView ? "p-3" : "p-4"}>
        <dl className={compactView ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-4"}>
          {fieldsToRender.map(([key, value]) => (
            <FieldRow key={key} label={key}>
              {renderValue(key, value)}
            </FieldRow>
          ))}
        </dl>

        {canExpand && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="
                inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs
                border border-black/10 bg-black/2 hover:bg-black/5
                dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10
                text-gray-700 dark:text-gray-200
                transition focus:outline-none focus:ring-2 focus:ring-blue-500/30
              "
              aria-expanded={showAll}
            >
              {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showAll ? "Show less" : "Show more"}
            </button>
          </div>
        )}
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

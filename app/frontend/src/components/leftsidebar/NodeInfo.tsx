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
  name: string;
  index?: number;
  node_index?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (node: NodeInfoProps) => void;
  onAddComment?: (
    node: NodeInfoProps,
    data: { name: string; text: string }
  ) => void;
  [key: string]: any;
}

const VISIBLE_SYNONYMS = 3;

const NodeInfo: React.FC<NodeInfoProps> = (props) => {
  const {
    name,
    isFavorite: isFavoriteProp,
    onAddComment,
    onToggleFavorite,
    ...restProps
  } = props;

  const id = restProps.id as string | undefined;
  const namespace = restProps.namespace as string | undefined;
  const def = restProps.def as string | undefined;
  const synonym = restProps.synonym as string[] | undefined;
  const is_a = restProps.is_a as string[] | undefined;

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

  const SPECIAL_KEYS = new Set([
    "id",
    "name",
    "namespace",
    "def",
    "synonym",
    "is_a",
    "isFavorite",
    "onToggleFavorite",
    "onAddComment",
    "index",
    "node_index",
  ]);

  const renderValue = (value: any) => {
    if (value == null) return null;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-xs text-gray-400">[]</span>;
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <CopyChip
              key={i}
              text={typeof v === "string" ? v : JSON.stringify(v)}
              title="Value"
              className="text-xs"
              onCopied={showCopied}
              mono={false}
            />
          ))}
        </div>
      );
    }

    if (typeof value === "object") {
      return (
        <pre className="text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto bg-white/5 rounded-md p-2">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return (
      <span className="text-sm break-all">
        {String(value)}
      </span>
    );
  };

  const additionalFields = Object.entries(restProps)
    .filter(
      ([key, value]) =>
        !SPECIAL_KEYS.has(key) && value !== undefined && value !== null
    )
    .sort(([a], [b]) => a.localeCompare(b));

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

          {/* ID + Namespace (GO Specific) */}
          {(id || namespace) && (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {id && (
                <CopyChip
                  text={id}
                  title="ID"
                  className="font-mono"
                  onCopied={showCopied}
                />
              )}
              {namespace && (
                <CopyChip
                  text={namespace}
                  title="Namespace"
                  className="text-[11px]"
                  onCopied={showCopied}
                  mono={false}
                />
              )}
            </div>
          )}
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
          {/* Definition (GO Specific) */}
          {def && (
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
          )}


          {/* Synonyms (GO Specific) */}
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

          {/* is_a (GO Specific) */}
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

          {/* Other properties for custom graphs */}
          {additionalFields.map(([key, value]) => (
            <FieldRow key={key} label={key}>
              {renderValue(value)}
            </FieldRow>
          ))}
        </dl>
      </div>

      {/* Add Comment Modal */}
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

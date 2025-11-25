import React, {
  useState,
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
  isFavorite?: boolean;
  onToggleFavorite?: (node: NodeInfoProps) => void;
  onAddComment?: (
    node: NodeInfoProps,
    data: { name: string; text: string }
  ) => void;
  [key: string]: any;
}

const NodeInfo: React.FC<NodeInfoProps> = (props) => {
  const {
    name,
    isFavorite: isFavoriteProp,
    onAddComment,
    onToggleFavorite,
    ...rawProps
  } = props;

  const id = rawProps.id as string | undefined;

  const [copied, setCopied] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  const { isFavorite: isFavHook, toggleFavorite, isLoading, isSaving } =
    useFavorites();
  const { addComment } = useComments();

  const fav = isLoading ? !!isFavoriteProp : (id ? isFavHook(id) : false);

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

  const handleToggleFav = useCallback(async () => {
    await toggleFavorite(props);
  }, [toggleFavorite, props]);

  const handleAddCommentOpen = useCallback(() => {
    setCommentOpen(true);
  }, []);

  const handleCommentSubmit = useCallback(
    (data: { name: string; text: string }) => {
      setCommentOpen(false);
      addComment({
        id: id ?? "", name,
        namespace: undefined
      }, data);
      onAddComment?.(props, data);
    },
    [addComment, id, name, onAddComment, props]
  );

  const HIDDEN_KEYS = new Set([ // keys that we receive but don't want to show
    "index",
  ]);

  const renderValue = (key: string, value: any) => {
    if (value == null) return null;

    // for long strings -> scrollable div with copy on click
    if (typeof value === "string") {
      const isLong =
        value.length > 20;

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
            className="text-sm whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-1
                        hover:bg-white/[0.02] rounded-md p-1 cursor-copy transition"
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
        return <span className="text-xs text-gray-400 overflow-y-auto">[]</span>;
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
  };

  const fields = Object.entries(rawProps) // filter out hidden keys and sort
    .filter(
      ([key, value]) =>
        !HIDDEN_KEYS.has(key) && value !== undefined && value !== null
    )
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <section
      id="info-panel"
      aria-labelledby="info-title"
      className="relative inline-block w-[400px] max-w-[92vw] max-h-[70vh]
                bg-black/70 backdrop-blur-md rounded-xl shadow-lg text-gray-200
                border border-gray-900/60 flex flex-col"
    >
      <span
        role="status"
        aria-live="polite"
        className={`fixed bottom-4 right-4 z-50
              text-[11px] text-green-400 font-medium
              bg-black/80 px-3 py-1 rounded-full shadow-lg
              select-none transition-opacity duration-200
              pointer-events-none
              ${copied ? "opacity-100" : "opacity-0"}`}
      >
        Copied!
      </span>

      <header className="flex items-start justify-between gap-3 p-4 border-b border-gray-900/60 cursor-default">
        <div className="min-w-0 text-left">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Name
          </div>
          <CopyChip
            text={name}
            title="Name"
            className="text-3xl sm:text-xl font-bold px-0 py-0 bg-transparent border-none
                       hover:bg-transparent hover:text-gray-100 cursor-copy leading-tight"
            onCopied={showCopied}
            mono={false}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFav}
            disabled={isSaving || !id}
            className={`shrink-0 p-2 rounded-md transition
                        focus:outline-none focus:ring-2 focus:ring-gray-700
                        ${fav
                ? "text-yellow-400 hover:bg-yellow-400/10"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
              }
                        ${isSaving || !id ? "opacity-60 cursor-not-allowed" : ""}`}
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

      <div className="pt-0 px-4 pb-4 cursor-default overflow-y-auto overflow-x-hidden flex-1">
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

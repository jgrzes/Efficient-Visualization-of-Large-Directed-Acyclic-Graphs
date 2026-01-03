import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal, AlertTriangle, Moon, Sun } from "lucide-react";
import { DEFAULT_GRAPH_COLORS, DEFAULT_BACKGROUND_BY_THEME } from "../graph/config";
import type { GraphColors } from "../graph/types";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  pointSize: number;
  colors: GraphColors;
  onApply: (pointSize: number, colors: GraphColors) => void;
}

type Theme = "light" | "dark";

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem("theme");
  return v === "dark" || v === "light" ? v : null;
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
}

function getActiveTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyThemeToDom(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function persistTheme(theme: Theme) {
  window.localStorage.setItem("theme", theme);
}

const getDefaultBackgroundForTheme = (theme: Theme) =>
  theme === "light"
    ? DEFAULT_BACKGROUND_BY_THEME.light
    : DEFAULT_BACKGROUND_BY_THEME.dark;

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  pointSize,
  colors,
  onApply,
}) => {
  const [pointSizeInput, setPointSizeInput] = useState(pointSize.toString());
  const [error, setError] = useState<string | null>(null);

  const [defaultColor, setDefaultColor] = useState(colors.default);
  const [parentColor, setParentColor] = useState(colors.parent);
  const [childColor, setChildColor] = useState(colors.child);
  const [selectedColor, setSelectedColor] = useState(colors.selected);
  const [hoverColor, setHoverColor] = useState(colors.hover);
  const [searchColor, setSearchColor] = useState(colors.search);
  const [backgroundColor, setBackgroundColor] = useState(colors.background);

  // Theme PREVIEW only (does not touch documentElement)
  const [pendingTheme, setPendingTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = readStoredTheme();
    return stored ?? (systemPrefersDark() ? "dark" : "light");
  });

  const themeLabel = useMemo(
    () => (pendingTheme === "dark" ? "Dark" : "Light"),
    [pendingTheme]
  );

  useEffect(() => {
    if (!open) return;

    const active = typeof window === "undefined" ? "dark" : getActiveTheme();
    setPendingTheme(active);

    setPointSizeInput(pointSize.toString());
    setDefaultColor(colors.default);
    setParentColor(colors.parent);
    setChildColor(colors.child);
    setSelectedColor(colors.selected);
    setHoverColor(colors.hover);
    setSearchColor(colors.search);
    setBackgroundColor(colors.background ?? getDefaultBackgroundForTheme(active));

    setError(null);
  }, [open, pointSize, colors]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const point = Number(pointSizeInput);
    if (!Number.isFinite(point) || point <= 0) {
      setError("point_size must be a positive number.");
      return;
    }

    // Apply theme globally ONLY here
    applyThemeToDom(pendingTheme);
    persistTheme(pendingTheme);

    const newColors: GraphColors = {
      default: defaultColor,
      parent: parentColor,
      child: childColor,
      selected: selectedColor,
      hover: hoverColor,
      search: searchColor,
      background: backgroundColor,
    };

    onApply(point, newColors);
    onClose();
  };

  const handleResetColors = () => {
    setDefaultColor(DEFAULT_GRAPH_COLORS.default);
    setParentColor(DEFAULT_GRAPH_COLORS.parent);
    setChildColor(DEFAULT_GRAPH_COLORS.child);
    setSelectedColor(DEFAULT_GRAPH_COLORS.selected);
    setHoverColor(DEFAULT_GRAPH_COLORS.hover);
    setSearchColor(DEFAULT_GRAPH_COLORS.search);
    setBackgroundColor(getDefaultBackgroundForTheme(pendingTheme));
  };

  const handleToggleTheme = () => {
    const next: Theme = pendingTheme === "dark" ? "light" : "dark";

    const currentDefault = getDefaultBackgroundForTheme(pendingTheme);
    const nextDefault = getDefaultBackgroundForTheme(next);

    setPendingTheme(next);
    setBackgroundColor((prev) => (prev === currentDefault ? nextDefault : prev));
  };

  // --- PREVIEW CLASSES (NO `dark:`) ---
  const isDark = pendingTheme === "dark";

  const overlayCls =
    "fixed inset-0 z-[1000] flex items-center justify-center backdrop-blur-sm bg-black/40";

  const cardCls = cx(
    "relative w-[min(92vw,460px)] rounded-2xl border p-6 shadow-2xl",
    isDark
      ? "border-white/10 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 text-gray-100 shadow-black/80"
      : "border-black/10 bg-white/95 text-gray-900 shadow-black/10"
  );

  const subtleTextCls = isDark ? "text-gray-400" : "text-gray-600";
  const labelTextCls = isDark ? "text-gray-300" : "text-gray-700";
  const headerTitleCls = isDark ? "text-white" : "text-gray-900";

  const closeBtnCls = cx(
    "absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full transition",
    isDark
      ? "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
      : "bg-black/5 text-gray-600 hover:bg-black/10 hover:text-gray-900"
  );

  const inputCls = cx(
    "w-20 rounded-md border px-2 py-1 text-[11px] outline-none",
    isDark
      ? "border-white/10 bg-black/40 text-gray-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50"
      : "border-black/10 bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
  );

  const colorsBoxCls = cx(
    "space-y-3 rounded-xl border p-3",
    isDark ? "border-white/10 bg-black/40" : "border-black/10 bg-black/[0.04]"
  );

  const resetBtnCls = cx(
    "text-[10px] px-2 py-1 rounded-md transition border",
    isDark
      ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
      : "border-black/10 bg-white text-gray-700 hover:bg-black/[0.03]"
  );

  const cancelBtnCls = cx(
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition border",
    isDark
      ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
      : "border-black/10 bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]"
  );

  const applyBtnCls =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-blue-600/90 text-white hover:bg-blue-500 transition";

  const toggleBtnCls = cx(
    "group relative inline-flex items-center h-9 w-[86px] shrink-0 rounded-full border transition shadow-sm",
    isDark
      ? "border-white/10 bg-zinc-900/60 hover:bg-zinc-900/80 focus:ring-blue-400/40"
      : "border-black/10 bg-white/80 hover:bg-white focus:ring-blue-500/40",
    "focus:outline-none focus:ring-2"
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={overlayCls}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className={cardCls}
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className={closeBtnCls}
              aria-label="Close settings"
              title="Close"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2 pr-8">
              <div className="flex items-center gap-2">
                <SlidersHorizontal
                  size={18}
                  className={isDark ? "text-blue-400" : "text-blue-600"}
                />
                <div>
                  <h2 className={cx("text-sm font-semibold", headerTitleCls)}>
                    Graph settings
                  </h2>
                  <p className={cx("text-xs", subtleTextCls)}>
                    Preview changes here — apply globally only after you press
                    Apply.
                  </p>
                </div>
              </div>

              {/* Theme toggle (preview only) */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className={toggleBtnCls}
                aria-label={`Switch to ${
                  pendingTheme === "dark" ? "light" : "dark"
                } theme`}
                title="Toggle theme (preview; applies on Apply)"
              >
                {/* icons */}
                <span
                  className={cx(
                    "pointer-events-none absolute left-2 opacity-90",
                    "text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.35)]"
                  )}
                >
                  <Sun size={15} />
                </span>
                <span
                  className={cx(
                    "pointer-events-none absolute right-2 opacity-90",
                    isDark
                      ? "text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.25)]"
                      : "text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.25)]"
                  )}
                >
                  <Moon size={15} />
                </span>

                {/* thumb */}
                <motion.span
                  className={cx(
                    "absolute top-1/2 -translate-y-1/2 h-7 w-7 rounded-full shadow-md border",
                    isDark
                      ? "bg-zinc-950 border-white/10"
                      : "bg-white border-black/10"
                  )}
                  animate={{ left: pendingTheme === "dark" ? 52 : 6 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                >
                  <span
                    className={cx(
                      "absolute inset-[3px] rounded-full",
                      isDark
                        ? "bg-gradient-to-b from-zinc-900 to-black"
                        : "bg-gradient-to-b from-white to-zinc-100"
                    )}
                  />
                </motion.span>
              </button>
            </div>

            <div className={cx("mb-4 text-[11px]", subtleTextCls)}>
              Theme preview:{" "}
              <span
                className={cx(
                  "font-medium",
                  isDark ? "text-gray-100" : "text-gray-900"
                )}
              >
                {themeLabel}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* point_size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className={cx("text-[11px]", labelTextCls)}>
                    point_size
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className={cx(
                        "text-[10px]",
                        isDark ? "text-gray-500" : "text-gray-500"
                      )}
                    >
                      px
                    </span>
                    <input
                      type="number"
                      min={0.4}
                      max={4}
                      step={0.2}
                      value={pointSizeInput}
                      onChange={(e) => setPointSizeInput(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min={0.4}
                  max={4}
                  step={0.2}
                  value={pointSizeInput}
                  onChange={(e) => setPointSizeInput(e.target.value)}
                  className={cx(
                    "w-full cursor-pointer",
                    isDark ? "accent-blue-500" : "accent-blue-600"
                  )}
                />

                <div
                  className={cx(
                    "flex justify-between text-[10px]",
                    isDark ? "text-gray-500" : "text-gray-500"
                  )}
                >
                  <span>0.4</span>
                  <span>4</span>
                </div>
              </div>

              {/* Colors */}
              <div className={colorsBoxCls}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span
                    className={cx(
                      "text-[11px] font-medium",
                      isDark ? "text-gray-200" : "text-gray-800"
                    )}
                  >
                    Colors
                  </span>
                  <button
                    type="button"
                    onClick={handleResetColors}
                    className={resetBtnCls}
                  >
                    Reset to defaults
                  </button>
                </div>

                <ColorRow
                  theme={pendingTheme}
                  label="Background"
                  description="Canvas / graph background color."
                  value={backgroundColor}
                  onChange={setBackgroundColor}
                />
                <ColorRow
                  theme={pendingTheme}
                  label="Default vertex"
                  description="Base color of all vertices."
                  value={defaultColor}
                  onChange={setDefaultColor}
                />
                <ColorRow
                  theme={pendingTheme}
                  label="Parent vertices"
                  description="Parents of the selected vertex."
                  value={parentColor}
                  onChange={setParentColor}
                />
                <ColorRow
                  theme={pendingTheme}
                  label="Child vertices"
                  description="Children of the selected vertex."
                  value={childColor}
                  onChange={setChildColor}
                />
                <ColorRow
                  theme={pendingTheme}
                  label="Selected vertex"
                  description="Currently selected vertex."
                  value={selectedColor}
                  onChange={setSelectedColor}
                />
                <ColorRow
                  theme={pendingTheme}
                  label="Hover vertex"
                  description="Vertex under the cursor."
                  value={hoverColor}
                  onChange={setHoverColor}
                />
                <ColorRow
                  theme={pendingTheme}
                  label="Search highlight"
                  description="Highlight color for search results."
                  value={searchColor}
                  onChange={setSearchColor}
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-600">
                  <AlertTriangle size={12} />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className={cancelBtnCls}>
                  Cancel
                </button>
                <button type="submit" className={applyBtnCls}>
                  Apply
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ColorRowProps {
  theme: Theme;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorRow: React.FC<ColorRowProps> = ({
  theme,
  label,
  description,
  value,
  onChange,
}) => {
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className={cx("text-[11px]", isDark ? "text-gray-200" : "text-gray-800")}>
          {label}
        </span>
        <span className={cx("text-[10px]", isDark ? "text-gray-500" : "text-gray-500")}>
          {description}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={cx("h-5 w-5 rounded-md border", isDark ? "border-white/20" : "border-black/15")}
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cx(
            "h-8 w-10 cursor-pointer rounded-md border p-0",
            isDark ? "border-white/10 bg-black/40" : "border-black/10 bg-white"
          )}
          aria-label={`${label} color`}
        />
      </div>
    </div>
  );
};

export default SettingsModal;

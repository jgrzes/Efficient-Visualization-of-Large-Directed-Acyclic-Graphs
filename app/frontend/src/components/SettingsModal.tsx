import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { DEFAULT_GRAPH_COLORS } from "../graphConfig";

export interface GraphColors {
  default: string;
  parent: string;
  child: string;
  selected: string;
  hover: string;
  search: string;
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  spaceSize: number;
  pointSize: number;
  colors: GraphColors;
  onApply: (spaceSize: number, pointSize: number, colors: GraphColors) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  spaceSize,
  pointSize,
  colors,
  onApply,
}) => {
  const [spaceSizeInput, setSpaceSizeInput] = useState(spaceSize.toString());
  const [pointSizeInput, setPointSizeInput] = useState(pointSize.toString());
  const [error, setError] = useState<string | null>(null);

  const [defaultColor, setDefaultColor] = useState(colors.default);
  const [parentColor, setParentColor] = useState(colors.parent);
  const [childColor, setChildColor] = useState(colors.child);
  const [selectedColor, setSelectedColor] = useState(colors.selected);
  const [hoverColor, setHoverColor] = useState(colors.hover);
  const [searchColor, setSearchColor] = useState(colors.search);

  useEffect(() => {
    if (open) {
      setSpaceSizeInput(spaceSize.toString());
      setPointSizeInput(pointSize.toString());
      setDefaultColor(colors.default);
      setParentColor(colors.parent);
      setChildColor(colors.child);
      setSelectedColor(colors.selected);
      setHoverColor(colors.hover);
      setSearchColor(colors.search);
      setError(null);
    }
  }, [open, spaceSize, pointSize, colors]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const space = Number(spaceSizeInput);
    const point = Number(pointSizeInput);

    if (!Number.isFinite(space) || space <= 0) {
      setError("space_size must be a positive number.");
      return;
    }
    if (!Number.isFinite(point) || point <= 0) {
      setError("point_size must be a positive number.");
      return;
    }

    const newColors: GraphColors = {
      default: defaultColor,
      parent: parentColor,
      child: childColor,
      selected: selectedColor,
      hover: hoverColor,
      search: searchColor,
    };

    onApply(space, point, newColors);
    onClose();
  };

  const handleResetColors = () => {
    setDefaultColor(DEFAULT_GRAPH_COLORS.default);
    setParentColor(DEFAULT_GRAPH_COLORS.parent);
    setChildColor(DEFAULT_GRAPH_COLORS.child);
    setSelectedColor(DEFAULT_GRAPH_COLORS.selected);
    setHoverColor(DEFAULT_GRAPH_COLORS.hover);
    setSearchColor(DEFAULT_GRAPH_COLORS.search);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="
              relative w-[min(92vw,440px)]
              rounded-2xl border border-white/10
              bg-gradient-to-b from-zinc-900/95 to-zinc-950/95
              shadow-2xl shadow-black/80
              text-gray-100
              p-6
            "
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="
                absolute right-3 top-3 z-20
                inline-flex h-8 w-8 items-center justify-center
                rounded-full bg-white/5 text-gray-400
                hover:bg-white/10 hover:text-white transition
              "
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal size={18} className="text-blue-400" />
              <h2 className="text-sm font-semibold text-white">
                Graph settings
              </h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Tune the layout and colors for the current graph visualization.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* space_size slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] text-gray-300">
                    space_size
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">px</span>
                    <input
                      type="number"
                      min={128}
                      max={4096}
                      step={128}
                      value={spaceSizeInput}
                      onChange={(e) => setSpaceSizeInput(e.target.value)}
                      className="
                        w-20 rounded-md border border-white/10
                        bg-black/40 px-2 py-1 text-[11px]
                        text-gray-100 outline-none
                        focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                      "
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min={128}
                  max={4096}
                  step={128}
                  value={spaceSizeInput}
                  onChange={(e) => setSpaceSizeInput(e.target.value)}
                  className="w-full cursor-pointer accent-blue-500"
                />

                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>128</span>
                  <span>4096</span>
                </div>

                <p className="text-[10px] text-gray-500">
                  Size of the layout space (higher = more spread out).
                </p>
              </div>

              {/* point_size slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] text-gray-300">
                    point_size
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">px</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      value={pointSizeInput}
                      onChange={(e) => setPointSizeInput(e.target.value)}
                      className="
                        w-20 rounded-md border border-white/10
                        bg-black/40 px-2 py-1 text-[11px]
                        text-gray-100 outline-none
                        focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                      "
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={pointSizeInput}
                  onChange={(e) => setPointSizeInput(e.target.value)}
                  className="w-full cursor-pointer accent-blue-500"
                />

                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>1</span>
                  <span>20</span>
                </div>

                <p className="text-[10px] text-gray-500">
                  Size of points representing vertices.
                </p>
              </div>

              {/* Colors section */}
              <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-[11px] font-medium text-gray-200">
                    Colors
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">
                      Vertex state color configuration
                    </span>
                    <button
                      type="button"
                      onClick={handleResetColors}
                      className="
                        text-[10px] px-2 py-1 rounded-md
                        bg-white/5 text-gray-300 hover:bg-white/10
                        transition
                      "
                    >
                      Reset to defaults
                    </button>
                  </div>
                </div>

                <ColorRow
                  label="Default vertex"
                  description="Base color of all vertices."
                  value={defaultColor}
                  onChange={setDefaultColor}
                />
                <ColorRow
                  label="Parent vertices"
                  description="Parents of the selected vertex."
                  value={parentColor}
                  onChange={setParentColor}
                />
                <ColorRow
                  label="Child vertices"
                  description="Children of the selected vertex."
                  value={childColor}
                  onChange={setChildColor}
                />
                <ColorRow
                  label="Selected vertex"
                  description="Currently selected vertex."
                  value={selectedColor}
                  onChange={setSelectedColor}
                />
                <ColorRow
                  label="Hover vertex"
                  description="Vertex under the cursor."
                  value={hoverColor}
                  onChange={setHoverColor}
                />
                <ColorRow
                  label="Search highlight"
                  description="Highlight color for search results."
                  value={searchColor}
                  onChange={setSearchColor}
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                  <AlertTriangle size={12} />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    inline-flex items-center gap-1.5
                    rounded-lg px-3 py-1.5
                    text-xs font-medium
                    bg-white/5 text-gray-300
                    hover:bg-white/10
                    transition
                  "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="
                    inline-flex items-center gap-1.5
                    rounded-lg px-3 py-1.5
                    text-xs font-medium
                    bg-blue-600/90 text-white
                    hover:bg-blue-500
                    transition
                  "
                >
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
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorRow: React.FC<ColorRowProps> = ({
  label,
  description,
  value,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="text-[11px] text-gray-200">{label}</span>
        <span className="text-[10px] text-gray-500">{description}</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="h-5 w-5 rounded-md border border-white/20"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            h-8 w-10 cursor-pointer rounded-md border border-white/10
            bg-black/40 p-0
          "
        />
      </div>
    </div>
  );
};

export default SettingsModal;

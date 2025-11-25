import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal, AlertTriangle } from "lucide-react";

interface SettingsModalProps {
    open: boolean;
    onClose: () => void;
    spaceSize: number;
    pointSize: number;
    onApply: (spaceSize: number, pointSize: number) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    open,
    onClose,
    spaceSize,
    pointSize,
    onApply,
}) => {
    const [spaceSizeInput, setSpaceSizeInput] = useState(spaceSize.toString());
    const [pointSizeInput, setPointSizeInput] = useState(pointSize.toString());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setSpaceSizeInput(spaceSize.toString());
            setPointSizeInput(pointSize.toString());
            setError(null);
        }
    }, [open, spaceSize, pointSize]);

    if (!open) return null;

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

        onApply(space, point);
    };

    return (
        <AnimatePresence>
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
            relative w-[min(92vw,420px)]
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
                        Change the visualization parameters of the current graph.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[11px] text-gray-300">
                                space_size
                            </label>
                            <input
                                type="number"
                                value={spaceSizeInput}
                                onChange={(e) => setSpaceSizeInput(e.target.value)}
                                min={1}
                                step={1}
                                className="
                  w-full rounded-lg
                  bg-black/60 border border-white/10
                  px-2.5 py-1.5
                  text-[11px] text-gray-200
                  outline-none
                  focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60
                "
                            />
                            <p className="text-[10px] text-gray-500">
                                Size of the space for the layout (e.g., 256, 512).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] text-gray-300">
                                point_size
                            </label>
                            <input
                                type="number"
                                value={pointSizeInput}
                                onChange={(e) => setPointSizeInput(e.target.value)}
                                min={1}
                                step={1}
                                className="
                  w-full rounded-lg
                  bg-black/60 border border-white/10
                  px-2.5 py-1.5
                  text-[11px] text-gray-200
                  outline-none
                  focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60
                "
                            />
                            <p className="text-[10px] text-gray-500">
                                Size of the points representing the vertices.
                            </p>
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
        </AnimatePresence>
    );
};

export default SettingsModal;

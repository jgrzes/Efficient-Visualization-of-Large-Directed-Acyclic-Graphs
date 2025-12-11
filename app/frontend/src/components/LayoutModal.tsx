import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Orbit, LayoutTemplate, Info } from "lucide-react";

interface LayoutModalProps {
    open: boolean;
    onCancel: () => void;
    onConfirm: (layoutType: "cpp" | "radial") => void;
}

const LayoutModal: React.FC<LayoutModalProps> = ({
    open,
    onCancel,
    onConfirm,
}) => {
    const [layoutType, setLayoutType] = useState<"cpp" | "radial">("cpp");

    useEffect(() => {
        if (open) {
            setLayoutType("cpp");
        }
    }, [open]);

    if (!open) return null;

    const handleConfirm = () => {
        onConfirm(layoutType);
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
                        relative w-[min(96vw,640px)]
                        max-h-[80vh]
                        rounded-2xl border border-white/10
                        bg-gradient-to-b from-zinc-900/95 to-zinc-950/95
                        shadow-2xl shadow-black/80
                        text-gray-100
                        p-5
                        flex flex-col
                    "
                >
                    {/* Close */}
                    <button
                        type="button"
                        onClick={onCancel}
                        className="
                            absolute right-3 top-3 z-20
                            inline-flex h-8 w-8 items-center justify-center
                            rounded-full bg-white/5 text-gray-400
                            hover:bg-white/10 hover:text-white transition
                        "
                    >
                        <X size={18} />
                    </button>

                    {/* Header */}
                    <div className="mb-4 pr-10">
                        <h2 className="text-sm font-semibold text-white mb-1">
                            Choose layout type
                        </h2>
                        <p className="text-xs text-gray-400 flex items-start gap-1.5">
                            <Info size={12} className="mt-[1px] text-gray-500" />
                            Select how the graph should be arranged on the canvas.
                            You can re-load the same file with a different layout later.
                        </p>
                    </div>

                    {/* Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-xs">
                        {/* C++ layout card */}
                        <button
                            type="button"
                            onClick={() => setLayoutType("cpp")}
                            className={`
                                group relative w-full text-left rounded-xl border px-3.5 py-3
                                flex flex-col gap-2
                                transition
                                ${layoutType === "cpp"
                                    ? "border-blue-500/70 bg-blue-600/15 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]"
                                    : "border-white/10 bg-black/20 hover:border-blue-500/50 hover:bg-blue-500/5"
                                }
                            `}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="inline-flex items-center gap-2">
                                    <div
                                        className="
                                            inline-flex h-8 w-8 items-center justify-center
                                            rounded-full bg-blue-600/20 text-blue-300
                                        "
                                    >
                                        <LayoutTemplate size={18} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-semibold text-white">
                                            C++ layout
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            Hierarchical, optimized layout
                                        </div>
                                    </div>
                                </div>
                                <span
                                    className={`
                                        text-[10px] px-2 py-0.5 rounded-full border
                                        ${layoutType === "cpp"
                                            ? "border-blue-400/80 bg-blue-500/20 text-blue-100"
                                            : "border-white/15 text-gray-300 bg-white/5"
                                        }
                                    `}
                                >
                                    Recommended
                                </span>
                            </div>
                            <ul className="mt-1.5 space-y-1 text-[10px] text-gray-300">
                                <li>• Uses the C++ backend layout algorithm.</li>
                                <li>• Emphasizes DAG hierarchy and reduces edge crossings.</li>
                                <li>• Best for exploring large GO DAGs and complex structures.</li>
                            </ul>
                        </button>

                        {/* Radial layout card */}
                        <button
                            type="button"
                            onClick={() => setLayoutType("radial")}
                            className={`
                                group relative w-full text-left rounded-xl border px-3.5 py-3
                                flex flex-col gap-2
                                transition
                                ${layoutType === "radial"
                                    ? "border-purple-500/70 bg-purple-600/15 shadow-[0_0_0_1px_rgba(168,85,247,0.4)]"
                                    : "border-white/10 bg-black/20 hover:border-purple-500/50 hover:bg-purple-500/5"
                                }
                            `}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="inline-flex items-center gap-2">
                                    <div
                                        className="
                                            inline-flex h-8 w-8 items-center justify-center
                                            rounded-full bg-purple-600/20 text-purple-300
                                        "
                                    >
                                        <Orbit size={18} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-semibold text-white">
                                            Radial layout
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            Root in the center, levels as rings
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <ul className="mt-1.5 space-y-1 text-[10px] text-gray-300">
                                <li>• Places the root node in the middle.</li>
                                <li>• Children are arranged on concentric circles.</li>
                                <li>• Good for smaller graphs or quick “overview from root”.</li>
                            </ul>
                        </button>
                    </div>

                    {/* Footer / actions */}
                    <div className="mt-2 flex justify-end gap-2 pt-2 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onCancel}
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
                            type="button"
                            onClick={handleConfirm}
                            className="
                                inline-flex items-center gap-1.5
                                rounded-lg px-3 py-1.5
                                text-xs font-medium
                                bg-blue-600/90 text-white
                                hover:bg-blue-500
                                transition
                            "
                        >
                            Confirm layout
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LayoutModal;

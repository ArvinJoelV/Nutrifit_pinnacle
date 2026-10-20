import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCompare, Zap, Check, AlertTriangle, ArrowRight, Loader2, Sparkles, Scale, Activity, Upload, Cpu, Server } from 'lucide-react';
import { comparePipelines } from '../../services/mealAnalysisService';

const PipelineComparisonModal = ({ isOpen, onClose, imageFile, onApplyMode }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [comparisonData, setComparisonData] = useState(null);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState(imageFile);

    React.useEffect(() => {
        setSelectedFile(imageFile);
    }, [imageFile]);

    const activeFile = selectedFile || imageFile;

    const runComparison = async (fileToUse = activeFile) => {
        if (!fileToUse) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await comparePipelines(fileToUse);
            setComparisonData(res.comparison);
        } catch (err) {
            setError(err.message || 'Comparison failed. Ensure backend server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-run comparison when opened with an image
    React.useEffect(() => {
        if (isOpen && activeFile && !comparisonData && !isLoading) {
            runComparison(activeFile);
        }
    }, [isOpen, activeFile]);

    if (!isOpen) return null;

    // Support both 'local'/'edge' and legacy 'optimized'/'legacy'
    const edge = comparisonData?.edge || comparisonData?.legacy;
    const local = comparisonData?.local || comparisonData?.optimized;
    const summary = comparisonData?.summary;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-4xl bg-gradient-to-b from-[#16181f] to-[#101115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                            <GitCompare className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white flex items-center gap-2">
                                <span>Pipeline Benchmark: Local vs Edge Node</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Side-by-Side
                                </span>
                            </h2>
                            <p className="text-xs text-white/50">
                                Direct accuracy, recall, and latency comparison on your meal photo
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {isLoading && (
                        <div className="py-16 text-center space-y-4">
                            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
                            <div className="text-sm font-bold text-white">Running Both Pipelines Concurrently...</div>
                            <p className="text-xs text-white/50 max-w-md mx-auto">
                                Benchmarking Edge Node (RS C100 / Legacy Pipeline) alongside the Local Neural Pipeline (YOLO11 + Depth Anything V2 + RANSAC 3D) on the identical image bitstream.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {!activeFile && !isLoading && !comparisonData && (
                        <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-3xl p-8 hover:border-amber-500/30 transition-colors bg-white/[0.01]">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                                <GitCompare className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-white mb-1.5">Select a Meal Photo to Benchmark</h3>
                            <p className="text-xs text-white/50 max-w-sm mx-auto mb-5 leading-relaxed">
                                Upload any meal plate to test detection recall (micro-garnishes, gravies, overlapping dishes) and physical 3D elevation between Local Pipeline and Edge Node.
                            </p>
                            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer transition-all shadow-lg shadow-amber-500/20">
                                <Upload className="w-4 h-4" />
                                <span>Choose Image</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0];
                                            setSelectedFile(file);
                                            runComparison(file);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    )}

                    {comparisonData && !isLoading && (
                        <>
                            {/* Summary Delta Banner */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-400" />
                                        <span>
                                            Local Pipeline detected {summary?.additional_items_detected?.length || 0} additional item(s) compared to Edge Node
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-white/60">
                                        Speedup: <strong className="text-white">{summary?.speedup_ratio}x</strong> | Caloric Delta: <strong className="text-white">{summary?.caloric_delta > 0 ? `+${summary.caloric_delta}` : summary?.caloric_delta} kcal</strong>
                                    </div>
                                </div>
                                {onApplyMode && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onApplyMode('local');
                                            onClose();
                                        }}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>Use Local Pipeline</span>
                                    </button>
                                )}
                            </div>

                            {/* Two-Column Side-by-Side Comparison */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Column 1: Edge Node */}
                                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                            <div>
                                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1">
                                                    <Zap className="w-3 h-3" /> Hardware Edge Node
                                                </span>
                                                <h3 className="text-base font-black text-white">Edge Node (RS C100)</h3>
                                            </div>
                                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                                                {edge?.execution_time_ms} ms
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-[11px] text-white/50 mb-1">Depth Strategy:</div>
                                                <div className="text-xs font-medium text-white/80 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                                                    {edge?.depth_method || 'Heuristic 2D Morphological Proxy'}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[11px] text-white/50 mb-1.5">
                                                    Detected Items ({edge?.detected_items_count}):
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {edge?.items?.map((name, i) => (
                                                        <span key={i} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/5 border border-white/10 text-white/80">
                                                            {name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-center">
                                                <div className="p-2.5 rounded-xl bg-white/[0.03]">
                                                    <div className="text-[10px] text-white/40 uppercase">Total Calories</div>
                                                    <div className="text-base font-black text-white">{edge?.total_calories} kcal</div>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-white/[0.03]">
                                                    <div className="text-[10px] text-white/40 uppercase">Total Mass</div>
                                                    <div className="text-base font-black text-white">{edge?.total_mass_g} g</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {onApplyMode && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onApplyMode('edge');
                                                onClose();
                                            }}
                                            className="w-full mt-4 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 hover:text-white transition-colors cursor-pointer"
                                        >
                                            Switch to Edge Node
                                        </button>
                                    )}
                                </div>

                                {/* Column 2: Local Pipeline */}
                                <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/30 space-y-4 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                                            <div>
                                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1">
                                                    <Cpu className="w-3 h-3" /> High-Accuracy Neural Core
                                                </span>
                                                <h3 className="text-base font-black text-white">Local Pipeline</h3>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {summary?.speedup_ratio > 1 && (
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                                                        {summary?.speedup_ratio}x Faster
                                                    </span>
                                                )}
                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                                                    {local?.execution_time_ms} ms
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-[11px] text-emerald-400/80 mb-1 flex items-center justify-between">
                                                    <span>Depth Strategy:</span>
                                                    {local?.plane_fitted && (
                                                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                                            ✓ 3D RANSAC Plane Fitted
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs font-medium text-white/90 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                                                    {local?.depth_method || 'RANSAC 3D Plane Fitting + Depth Anything V2'}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[11px] text-white/50 mb-1.5">
                                                    Detected Items ({local?.detected_items_count}):
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {local?.items?.map((name, i) => {
                                                        const isNew = summary?.additional_items_detected?.includes(name);
                                                        return (
                                                            <span
                                                                key={i}
                                                                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${
                                                                    isNew
                                                                        ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-200 shadow-sm'
                                                                        : 'bg-white/10 border border-white/10 text-white/90'
                                                                }`}
                                                            >
                                                                {isNew && <Sparkles className="w-3 h-3 text-emerald-400" />}
                                                                <span>{name}</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-center">
                                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                    <div className="text-[10px] text-emerald-300/80 uppercase">Total Calories</div>
                                                    <div className="text-base font-black text-emerald-300">{local?.total_calories} kcal</div>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                    <div className="text-[10px] text-emerald-300/80 uppercase">Total Mass</div>
                                                    <div className="text-base font-black text-emerald-300">{local?.total_mass_g} g</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {onApplyMode && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onApplyMode('local');
                                                onClose();
                                            }}
                                            className="w-full mt-4 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
                                        >
                                            Keep Local Pipeline Active
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default PipelineComparisonModal;

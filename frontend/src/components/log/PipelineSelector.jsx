import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, RefreshCw, GitCompare, Sparkles, Check, Info } from 'lucide-react';
import { getPipelineConfig, setPipelineConfig } from '../../services/mealAnalysisService';

const PipelineSelector = ({
    selectedMode = 'optimized',
    onModeChange,
    onOpenComparison,
    hasImage = false,
}) => {
    const [mode, setMode] = useState(selectedMode);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setMode(selectedMode);
    }, [selectedMode]);

    // Fetch initial backend configuration
    useEffect(() => {
        let isMounted = true;
        getPipelineConfig().then((cfg) => {
            if (isMounted && cfg?.active_mode) {
                setMode(cfg.active_mode);
                if (onModeChange) onModeChange(cfg.active_mode);
            }
        });
        return () => { isMounted = false; };
    }, []);

    const handleSelect = async (newMode) => {
        if (newMode === mode) return;
        setMode(newMode);
        if (onModeChange) onModeChange(newMode);

        setIsSaving(true);
        try {
            await setPipelineConfig(newMode);
        } catch (err) {
            console.warn('Failed to persist pipeline config:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-white/[0.07] via-white/[0.04] to-white/[0.07] border border-white/10 rounded-2xl p-2 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between px-3 py-1.5 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>AI Vision Engine</span>
                        </span>
                    </div>
                    {onOpenComparison && (
                        <button
                            type="button"
                            onClick={onOpenComparison}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                                hasImage
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60 cursor-pointer'
                            }`}
                            title="Run both pipelines side-by-side to compare detection recall, depth accuracy and speed"
                        >
                            <GitCompare className="w-3.5 h-3.5" />
                            <span>Compare V1 vs V2</span>
                        </button>
                    )}
                </div>

                {/* 2-Way Segmented Control */}
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                    {/* Mode 1: Optimized V2 */}
                    <button
                        type="button"
                        onClick={() => handleSelect('optimized')}
                        className={`relative px-3 py-2.5 rounded-lg text-left transition-all ${
                            mode === 'optimized'
                                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 text-white shadow-md'
                                : 'bg-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black tracking-tight flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Optimized V2</span>
                            </span>
                            {mode === 'optimized' && (
                                <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center text-[10px]">
                                    <Check className="w-2.5 h-2.5" />
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-white/60 leading-tight">
                            RANSAC 3D Depth • Soft-NMS • High-Recall
                        </div>
                    </button>

                    {/* Mode 2: Legacy V1 */}
                    <button
                        type="button"
                        onClick={() => handleSelect('legacy')}
                        className={`relative px-3 py-2.5 rounded-lg text-left transition-all ${
                            mode === 'legacy'
                                ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/10 border border-blue-500/40 text-white shadow-md'
                                : 'bg-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                                <span>Legacy V1</span>
                            </span>
                            {mode === 'legacy' && (
                                <span className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-400 text-blue-400 flex items-center justify-center text-[10px]">
                                    <Check className="w-2.5 h-2.5" />
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-white/60 leading-tight">
                            Standard YOLOv8 • SAM2 • Heuristic Depth
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PipelineSelector;

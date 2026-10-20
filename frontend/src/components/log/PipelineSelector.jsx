import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, GitCompare, Sparkles, Check, Server } from 'lucide-react';
import { getPipelineConfig, setPipelineConfig } from '../../services/mealAnalysisService';

const PipelineSelector = ({
    selectedMode = 'local',
    onModeChange,
    onOpenComparison,
    hasImage = false,
}) => {
    // Normalize mode: 'optimized' -> 'local', 'legacy' -> 'edge'
    const normalizeMode = (m) => (m === 'legacy' || m === 'edge' ? 'edge' : 'local');
    const [mode, setMode] = useState(normalizeMode(selectedMode));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setMode(normalizeMode(selectedMode));
    }, [selectedMode]);

    // Fetch initial backend configuration
    useEffect(() => {
        let isMounted = true;
        getPipelineConfig().then((cfg) => {
            if (isMounted && cfg?.active_mode) {
                const norm = normalizeMode(cfg.active_mode);
                setMode(norm);
                if (onModeChange) onModeChange(norm);
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
            <div className="bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.06] border border-white/10 rounded-2xl p-2.5 shadow-xl backdrop-blur-md">
                {/* Header with Title and Small Corner Comparison Button */}
                <div className="flex items-center justify-between px-3 py-1 mb-2.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5 text-primary" />
                            <span>Execution Target</span>
                        </span>
                    </div>

                    {/* Discreet Corner Compare Button */}
                    {onOpenComparison && (
                        <button
                            type="button"
                            onClick={onOpenComparison}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                hasImage
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 shadow-sm'
                                    : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                            }`}
                            title="Benchmark Local vs Edge Node side-by-side on this meal image"
                        >
                            <GitCompare className="w-3 h-3 text-amber-400" />
                            <span>Compare</span>
                        </button>
                    )}
                </div>

                {/* 2-Way Segmented Control: Local vs Edge Node */}
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                    {/* Mode 1: Local Pipeline (High-Accuracy Neural) */}
                    <button
                        type="button"
                        onClick={() => handleSelect('local')}
                        className={`relative px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            mode === 'local'
                                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 text-white shadow-md shadow-emerald-500/10'
                                : 'bg-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black tracking-tight flex items-center gap-1.5 text-white">
                                <Cpu className={`w-3.5 h-3.5 ${mode === 'local' ? 'text-emerald-400' : 'text-white/40'}`} />
                                <span>Local Pipeline</span>
                            </span>
                            {mode === 'local' ? (
                                <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center text-[10px]">
                                    <Check className="w-2.5 h-2.5" />
                                </span>
                            ) : (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-white/5 text-white/30">
                                    Server
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-white/60 leading-tight">
                            YOLO11-Seg • Depth Anything V2 • 3D RANSAC
                        </div>
                    </button>

                    {/* Mode 2: Edge Node (NVIDIA RS C100 Pro) */}
                    <button
                        type="button"
                        onClick={() => handleSelect('edge')}
                        className={`relative px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            mode === 'edge'
                                ? 'bg-gradient-to-r from-amber-500/20 to-cyan-500/10 border border-amber-500/40 text-white shadow-md shadow-amber-500/10'
                                : 'bg-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black tracking-tight flex items-center gap-1.5 text-white">
                                <Zap className={`w-3.5 h-3.5 ${mode === 'edge' ? 'text-amber-400' : 'text-white/40'}`} />
                                <span>Edge Node</span>
                            </span>
                            {mode === 'edge' ? (
                                <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center text-[10px]">
                                    <Check className="w-2.5 h-2.5" />
                                </span>
                            ) : (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-white/5 text-white/30">
                                    RS C100
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-white/60 leading-tight">
                            NVIDIA RS C100 Pro • Hardware Edge Pipeline
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PipelineSelector;

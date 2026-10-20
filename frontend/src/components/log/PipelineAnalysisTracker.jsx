import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye,
    Layers,
    Scale,
    Activity,
    Shapes,
    Box,
    Weight,
    ShieldAlert,
    Sparkles,
    CheckCircle2,
    Loader2,
    Cpu,
    Zap,
    Radio,
    Clock,
} from 'lucide-react';

export const LOCAL_PIPELINE_STAGES = [
    {
        stage: 1,
        name: "Concurrent Detection & Depth Prior",
        shortName: "Detection",
        desc: "High-recall sweep with SAHI container slicing & spatial bowl clustering",
        tech: "YOLO11-Seg + Soft-NMS",
        icon: Eye,
        color: "text-emerald-400",
        glow: "rgba(16, 185, 129, 0.35)",
    },
    {
        stage: 2,
        name: "Single-Pass Instance Segmentation",
        shortName: "Segmentation",
        desc: "Instant polygon mask extraction for all items without sequential delays",
        tech: "YOLO11s-Seg (Single-Pass)",
        icon: Layers,
        color: "text-teal-400",
        glow: "rgba(20, 184, 166, 0.35)",
    },
    {
        stage: 3,
        name: "Metric Scale & Perspective Calibration",
        shortName: "Scale",
        desc: "Plate rim ellipse localization & camera tilt angle correction (px/cm)",
        tech: "RANSAC Ellipse Fit",
        icon: Scale,
        color: "text-cyan-400",
        glow: "rgba(6, 182, 212, 0.35)",
    },
    {
        stage: 4,
        name: "RANSAC 3D Surface Fitting & Depth",
        shortName: "3D Elevation",
        desc: "Depth Anything V2 surface extraction & true perpendicular height in cm",
        tech: "Depth Anything V2 + RANSAC",
        icon: Activity,
        color: "text-sky-400",
        glow: "rgba(14, 165, 233, 0.35)",
    },
    {
        stage: 5,
        name: "Multi-Signal Occlusion Recovery",
        shortName: "Occlusion",
        desc: "Twin-item asymmetry & hidden area reconstruction for overlapping dishes",
        tech: "Surface Inpainting",
        icon: Shapes,
        color: "text-indigo-400",
        glow: "rgba(99, 102, 241, 0.35)",
    },
    {
        stage: 6,
        name: "Category-Specific 3D Volume Integration",
        shortName: "3D Volume",
        desc: "Voxel integration across pile, flat, liquid, and piece shape models",
        tech: "Voxel Height (cm³)",
        icon: Box,
        color: "text-violet-400",
        glow: "rgba(139, 92, 246, 0.35)",
    },
    {
        stage: 7,
        name: "Empirical Density & Mass Calculation",
        shortName: "Mass",
        desc: "Mapping physical volume to grams using verified culinary densities",
        tech: "Density Matrix (g/cm³)",
        icon: Weight,
        color: "text-amber-400",
        glow: "rgba(245, 158, 11, 0.35)",
    },
    {
        stage: 8,
        name: "Uncertainty & Confidence Intervals",
        shortName: "Confidence",
        desc: "Prediction interval calibration generating [lower, upper] mass bounds",
        tech: "Bayesian 90% CI",
        icon: ShieldAlert,
        color: "text-orange-400",
        glow: "rgba(249, 115, 22, 0.35)",
    },
    {
        stage: 9,
        name: "Gemini Clinical Synthesis & Macro Audit",
        shortName: "Clinical Audit",
        desc: "Indian cuisine vegetarian verification, authentic dish labeling & macros",
        tech: "Gemini 2.5 Flash",
        icon: Sparkles,
        color: "text-emerald-400",
        glow: "rgba(16, 185, 129, 0.35)",
    },
];

export const EDGE_PIPELINE_STAGES = [
    {
        stage: 1,
        name: "Edge Hardware Object Detection",
        shortName: "Detection",
        desc: "Hardware-accelerated food bounding box localization on edge TPU",
        tech: "TensorRT YOLOv8 (Edge)",
        icon: Eye,
        color: "text-amber-400",
        glow: "rgba(245, 158, 11, 0.35)",
    },
    {
        stage: 2,
        name: "SAM Instance Segmentation",
        shortName: "Segmentation",
        desc: "Prompt-guided segment mask extraction on edge node",
        tech: "SAM2 (Point-Prompted)",
        icon: Layers,
        color: "text-cyan-400",
        glow: "rgba(6, 182, 212, 0.35)",
    },
    {
        stage: 3,
        name: "Plate Contour Scale Calibration",
        shortName: "Scale",
        desc: "Diameter-based pixel-to-centimeter calibration reference",
        tech: "Contour Ellipse",
        icon: Scale,
        color: "text-emerald-400",
        glow: "rgba(16, 185, 129, 0.35)",
    },
    {
        stage: 4,
        name: "Monocular Elevation Depth Mapping",
        shortName: "Depth Map",
        desc: "2D morphological height profiling & elevation gradients",
        tech: "Morphological Depth",
        icon: Activity,
        color: "text-sky-400",
        glow: "rgba(14, 165, 233, 0.35)",
    },
    {
        stage: 5,
        name: "Occlusion Geometry Analysis",
        shortName: "Occlusion",
        desc: "Geometric bounding box overlap and boundary occlusion scoring",
        tech: "IoU & Contour Heuristics",
        icon: Shapes,
        color: "text-orange-400",
        glow: "rgba(249, 115, 22, 0.35)",
    },
    {
        stage: 6,
        name: "Volumetric Calculation Models",
        shortName: "3D Volume",
        desc: "Shape strategy volume computation across food instances",
        tech: "Geometric Volume (cm³)",
        icon: Box,
        color: "text-violet-400",
        glow: "rgba(139, 92, 246, 0.35)",
    },
    {
        stage: 7,
        name: "Density & Mass Estimation",
        shortName: "Mass",
        desc: "Portion mass computation via empirical density lookup",
        tech: "Density Lookup (g/cm³)",
        icon: Weight,
        color: "text-amber-400",
        glow: "rgba(245, 158, 11, 0.35)",
    },
    {
        stage: 8,
        name: "Scene Reliability Assessment",
        shortName: "Confidence",
        desc: "Scoring image clarity and prediction certainty on edge",
        tech: "Confidence Scoring",
        icon: ShieldAlert,
        color: "text-yellow-400",
        glow: "rgba(234, 179, 8, 0.35)",
    },
    {
        stage: 9,
        name: "Gemini Nutritional Validation",
        shortName: "Validation",
        desc: "Cloud clinical macro validation and nutritional cross-check",
        tech: "Gemini 2.5 Flash",
        icon: Sparkles,
        color: "text-purple-400",
        glow: "rgba(168, 85, 247, 0.35)",
    },
];

// Default export for backward compatibility
export const PIPELINE_STAGES = LOCAL_PIPELINE_STAGES;

const PipelineAnalysisTracker = ({
    currentStage = 1,
    isCompleted = false,
    liveStageInfo = {},
    pipelineMode = 'local',
}) => {
    const isEdge = pipelineMode === 'edge' || pipelineMode === 'legacy';
    const stages = isEdge ? EDGE_PIPELINE_STAGES : LOCAL_PIPELINE_STAGES;
    const activeStageIndex = Math.min(Math.max(currentStage - 1, 0), stages.length - 1);
    const activeStageData = stages[activeStageIndex] || stages[0];
    const progressPercent = isCompleted ? 100 : Math.min(96, Math.round((currentStage / stages.length) * 100));

    // Live elapsed stopwatch timer
    const [elapsedMs, setElapsedMs] = useState(0);
    useEffect(() => {
        if (isCompleted) return;
        const start = Date.now();
        const timer = setInterval(() => {
            setElapsedMs(Date.now() - start);
        }, 60);
        return () => clearInterval(timer);
    }, [isCompleted]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col h-full bg-[#0a0b0e]/80 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden"
        >
            {/* Ambient Background Glow matching the active stage */}
            <div
                className="absolute -top-12 -right-12 w-80 h-80 rounded-full blur-[110px] pointer-events-none transition-all duration-700"
                style={{
                    backgroundColor: activeStageData.glow,
                    opacity: 0.18,
                }}
            />

            {/* Top Header Card */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm ${
                        isEdge
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
                    }`}>
                        {isEdge ? <Zap className="w-5 h-5 animate-pulse" /> : <Cpu className="w-5 h-5 animate-pulse" />}
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-base text-white tracking-tight">AI 3D Portion Engine</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border flex items-center gap-1 ${
                                isEdge
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}>
                                {isEdge ? '⚡ NVIDIA RS C100 Edge' : '🧠 Local Neural Pipeline'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 text-white/50 border border-white/10 flex items-center gap-1">
                                <Radio className="w-2.5 h-2.5 text-primary animate-pulse" /> {liveStageInfo?.broker || 'Live SSE Stream'}
                            </span>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">
                            {isEdge
                                ? 'Hardware-accelerated edge inference with RS C100 Pro'
                                : 'High-recall Soft-NMS, YOLO11s-Seg, and Depth-Anything-V2 RANSAC 3D surface mapping'}
                        </p>
                    </div>
                </div>

                {/* Live Stopwatch & Percentage */}
                <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end text-white/90">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-mono text-sm font-bold tracking-tight">
                            {liveStageInfo?.total_ms ? `${liveStageInfo.total_ms}ms` : `${(elapsedMs / 1000).toFixed(1)}s`}
                        </span>
                    </div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400 mt-0.5">
                        {isCompleted ? '100% Completed' : `${progressPercent}% • Stage ${currentStage}/9`}
                    </span>
                </div>
            </div>

            {/* Glowing Linear Progress Bar */}
            <div className="mt-4 mb-4 relative z-10">
                <div className="w-full h-2 rounded-full bg-black/50 border border-white/10 overflow-hidden p-0.5">
                    <motion.div
                        className={`h-full rounded-full transition-all duration-300 ${
                            isEdge
                                ? 'bg-gradient-to-r from-amber-500 via-orange-400 to-cyan-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        }`}
                        initial={{ width: '8%' }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Active Stage Hero Spotlight Card */}
            <motion.div
                key={activeStageData.stage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mb-4 p-4 rounded-2xl bg-white/[0.04] border border-white/10 relative z-10 overflow-hidden shadow-lg"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ${activeStageData.color}`}>
                            <activeStageData.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-white tracking-wide truncate">
                                    Stage {activeStageData.stage}: {activeStageData.name}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-white/80 font-bold border border-white/10">
                                    {activeStageData.tech}
                                </span>
                            </div>
                            <p className="text-xs text-white/60 mt-0.5 line-clamp-1">
                                {activeStageData.desc}
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-bold">
                        {isCompleted ? (
                            <span className="text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                            </span>
                        ) : (
                            <div className="flex items-center gap-1.5 text-amber-300">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                <span>{liveStageInfo?.duration_ms ? `${liveStageInfo.duration_ms}ms` : 'Processing'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Compact 9-Stage Checklist */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar relative z-10">
                {stages.map((s) => {
                    const isDone = isCompleted || s.stage < currentStage;
                    const isCurrent = !isCompleted && s.stage === currentStage;
                    const stageDur = liveStageInfo?.stageDurations?.[s.stage];
                    const Icon = s.icon;

                    return (
                        <div
                            key={s.stage}
                            className={`px-3 py-2 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                                isCurrent
                                    ? isEdge
                                        ? 'bg-amber-500/[0.08] border-amber-500/40 shadow-sm shadow-amber-500/10'
                                        : 'bg-emerald-500/[0.08] border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                                    : isDone
                                    ? 'bg-white/[0.02] border-emerald-500/20 text-white/90'
                                    : 'bg-transparent border-white/5 opacity-35 text-white/40'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-mono font-black ${
                                        isDone
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : isCurrent
                                            ? isEdge
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-white/5 text-white/30 border border-white/10'
                                    }`}
                                >
                                    {isDone ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                        `0${s.stage}`
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? s.color : isDone ? 'text-emerald-400' : 'text-white/30'}`} />
                                        <span className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : ''}`}>
                                            {s.name}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="shrink-0 text-right">
                                {isDone ? (
                                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                                        {stageDur ? `${stageDur}ms` : 'Passed'}
                                    </span>
                                ) : isCurrent ? (
                                    <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 uppercase tracking-wider">
                                        <Loader2 className="w-3 h-3 animate-spin" /> In Progress
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-semibold text-white/20 uppercase tracking-wider">
                                        Queued
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default PipelineAnalysisTracker;

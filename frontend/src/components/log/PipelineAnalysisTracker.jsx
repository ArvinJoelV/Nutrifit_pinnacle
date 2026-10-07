import React from 'react';
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
} from 'lucide-react';

export const PIPELINE_STAGES = [
    {
        stage: 1,
        name: "YOLOv8 Object Detection",
        shortName: "Detection",
        desc: "Localizing food bounding boxes and dinnerware containers",
        tech: "YOLOv8x-Food",
        icon: Eye,
        color: "text-blue-400",
        glow: "rgba(96, 165, 250, 0.4)",
    },
    {
        stage: 2,
        name: "SAM2 Instance Segmentation",
        shortName: "Segmentation",
        desc: "Extracting pixel-level boundaries and instance masks",
        tech: "Segment Anything 2",
        icon: Layers,
        color: "text-cyan-400",
        glow: "rgba(34, 211, 238, 0.4)",
    },
    {
        stage: 3,
        name: "Metric Scale Calibration",
        shortName: "Calibration",
        desc: "Estimating plate diameter & perspective tilt (px/cm)",
        tech: "Ellipse Contour Fit",
        icon: Scale,
        color: "text-emerald-400",
        glow: "rgba(52, 211, 153, 0.4)",
    },
    {
        stage: 4,
        name: "Monocular Depth Mapping",
        shortName: "Depth Map",
        desc: "Profiling 3D surface elevation and food heights",
        tech: "Depth-Anything V2",
        icon: Activity,
        color: "text-amber-400",
        glow: "rgba(251, 191, 36, 0.4)",
    },
    {
        stage: 5,
        name: "Occlusion Reconstruction",
        shortName: "Occlusion",
        desc: "Recovering hidden surfaces of overlapping foods",
        tech: "Surface Inpainting",
        icon: Shapes,
        color: "text-orange-400",
        glow: "rgba(251, 146, 60, 0.4)",
    },
    {
        stage: 6,
        name: "3D Volumetric Integration",
        shortName: "Volume 3D",
        desc: "Computing geometric volume across pile/flat shape models",
        tech: "3D Integration (cm³)",
        icon: Box,
        color: "text-violet-400",
        glow: "rgba(167, 139, 250, 0.4)",
    },
    {
        stage: 7,
        name: "Density & Mass Calculation",
        shortName: "Mass Estimate",
        desc: "Computing physical weight using empirical food density (ρ)",
        tech: "Density Matrix (g/cm³)",
        icon: Weight,
        color: "text-pink-400",
        glow: "rgba(244, 114, 182, 0.4)",
    },
    {
        stage: 8,
        name: "Uncertainty & Confidence",
        shortName: "Confidence",
        desc: "Scoring prediction intervals and scene reliability bounds",
        tech: "Bayesian 90% CI",
        icon: ShieldAlert,
        color: "text-yellow-400",
        glow: "rgba(250, 204, 21, 0.4)",
    },
    {
        stage: 9,
        name: "Gemini Clinical Validation",
        shortName: "Clinical Macros",
        desc: "Cross-validating nutritional breakdown and clinical safety",
        tech: "Gemini 2.5 Flash",
        icon: Sparkles,
        color: "text-purple-400",
        glow: "rgba(192, 132, 252, 0.4)",
    },
];

const PipelineAnalysisTracker = ({ currentStage = 1, isCompleted = false, liveStageInfo = {} }) => {
    const activeStageData = PIPELINE_STAGES[Math.min(Math.max(currentStage - 1, 0), PIPELINE_STAGES.length - 1)] || PIPELINE_STAGES[0];
    const progressPercent = isCompleted ? 100 : Math.min(95, Math.round((currentStage / PIPELINE_STAGES.length) * 100));

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full bg-black/30 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl relative overflow-hidden"
        >
            {/* Ambient Background Glow */}
            <div
                className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[100px] pointer-events-none transition-all duration-700"
                style={{
                    backgroundColor: activeStageData.glow,
                    opacity: 0.15,
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shadow-primary/20">
                        <Cpu className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-base text-white tracking-tight">AI Nutrition Pipeline</h3>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                                <Radio className="w-2.5 h-2.5 animate-pulse" /> {liveStageInfo?.broker || 'Live SSE'}
                            </span>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">
                            Real-time 9-stage CV streaming via Redis Pub/Sub & Kafka
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-xl font-black text-white">{progressPercent}%</span>
                    <span className="block text-[10px] uppercase tracking-wider text-white/40 font-bold">
                        {isCompleted ? 'Complete' : `Stage ${currentStage}/9`}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 mb-4 relative z-10">
                <div className="w-full h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden p-0.5">
                    <motion.div
                        className="h-full rounded-full bg-linear-to-r from-primary via-cyan-400 to-amber-300 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                        initial={{ width: '10%' }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Active Stage Callout Card */}
            <motion.div
                key={activeStageData.stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-4 p-4 rounded-2xl bg-white/[0.04] border border-white/10 relative z-10 overflow-hidden"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${activeStageData.color}`}>
                            <activeStageData.icon className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white tracking-wide">
                                    {activeStageData.name}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-white/60 font-semibold">
                                    {activeStageData.tech}
                                </span>
                            </div>
                            <p className="text-xs text-white/60 mt-0.5">
                                {activeStageData.desc}
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold">
                        {isCompleted ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                        ) : (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{liveStageInfo?.duration_ms ? `${liveStageInfo.duration_ms}ms` : 'Processing'}</span>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Step List Timeline */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar relative z-10">
                {PIPELINE_STAGES.map((s) => {
                    const isDone = isCompleted || s.stage < currentStage;
                    const isCurrent = !isCompleted && s.stage === currentStage;
                    const isPending = !isCompleted && s.stage > currentStage;
                    const Icon = s.icon;
                    const stageDur = liveStageInfo?.stageDurations?.[s.stage];

                    return (
                        <div
                            key={s.stage}
                            className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                                isCurrent
                                    ? 'bg-white/[0.08] border-primary/50 shadow-md shadow-primary/10'
                                    : isDone
                                    ? 'bg-emerald-500/[0.03] border-emerald-500/20 text-white/90'
                                    : 'bg-white/[0.02] border-white/5 opacity-40 text-white/50'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                                        isDone
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : isCurrent
                                            ? 'bg-primary/20 text-primary border border-primary/40'
                                            : 'bg-white/5 text-white/40 border border-white/10'
                                    }`}
                                >
                                    {isDone ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        `0${s.stage}`
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? s.color : isDone ? 'text-emerald-400' : 'text-white/40'}`} />
                                        <span className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : ''}`}>
                                            {s.name}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-white/40 block truncate">
                                        {s.tech}
                                    </span>
                                </div>
                            </div>

                            <div className="shrink-0 text-right">
                                {isDone ? (
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                        {stageDur ? `${stageDur}ms` : 'Passed'}
                                    </span>
                                ) : isCurrent ? (
                                    <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 uppercase tracking-wider">
                                        <Loader2 className="w-3 h-3 animate-spin" /> In Progress
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
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

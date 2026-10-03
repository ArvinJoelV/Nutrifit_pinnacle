import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    Clock,
    FileCode,
    Cpu,
    Sparkles,
    Eye,
    Layers,
    Scale,
    Activity,
    ShieldAlert,
    Box
} from 'lucide-react';

const STAGE_ICONS = {
    1: Eye,
    2: Layers,
    3: Scale,
    4: Activity,
    5: ShieldAlert,
    6: Box,
    7: Cpu,
    8: Sparkles,
    9: Sparkles,
};

const PipelineInspectorModal = ({ isOpen, onClose, trace = [], durationMs = 0, summaryData = {} }) => {
    const [expandedStages, setExpandedStages] = useState({ 1: true, 3: true, 6: true, 7: true });
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const toggleStage = (stageNum) => {
        setExpandedStages(prev => ({
            ...prev,
            [stageNum]: !prev[stageNum]
        }));
    };

    const expandAll = () => {
        const all = {};
        trace.forEach(s => { all[s.stage] = true; });
        setExpandedStages(all);
    };

    const collapseAll = () => {
        setExpandedStages({});
    };

    const handleCopyJson = () => {
        const payload = {
            total_duration_ms: durationMs,
            summary: summaryData,
            pipeline_trace: trace,
        };
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0d0d12] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-white"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                <Cpu className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-base text-white">3D Portion Pipeline Inspector</h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                        Live Trace
                                    </span>
                                    {summaryData?.execution_target && (
                                        summaryData.execution_target.toLowerCase().includes('c100') ||
                                        summaryData.execution_target.toLowerCase().includes('edge') ||
                                        summaryData.execution_target.toLowerCase().includes('jetson') ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm shadow-emerald-500/20">
                                                <Cpu className="w-3 h-3" /> {summaryData.execution_target}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-white/70 border border-white/10 flex items-center gap-1">
                                                <Cpu className="w-3 h-3" /> {summaryData.execution_target}
                                            </span>
                                        )
                                    )}
                                </div>
                                <p className="text-xs text-white/50 mt-0.5">
                                    Step-by-step execution metrics of every Python module & function
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCopyJson}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors text-white/80 hover:text-white"
                                title="Copy trace as JSON"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Summary Bar */}
                    <div className="px-6 py-3 bg-white/[0.01] border-b border-white/5 flex items-center justify-between text-xs flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-white/60">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Total Time:</span>
                                <span className="font-mono font-bold text-white">{durationMs} ms</span>
                            </div>
                            <div className="text-white/20">•</div>
                            <div className="flex items-center gap-1.5 text-white/60">
                                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Stages:</span>
                                <span className="font-mono font-bold text-white">{trace.length} of 9 executed</span>
                            </div>
                            {summaryData.total_mass_g != null && (
                                <>
                                    <div className="text-white/20">•</div>
                                    <div className="flex items-center gap-1.5 text-white/60">
                                        <Scale className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Total Mass:</span>
                                        <span className="font-mono font-bold text-amber-300">{summaryData.total_mass_g} g</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={expandAll}
                                className="text-[11px] text-white/50 hover:text-white underline decoration-white/20 hover:decoration-white transition-colors"
                            >
                                Expand all
                            </button>
                            <span className="text-white/20">•</span>
                            <button
                                type="button"
                                onClick={collapseAll}
                                className="text-[11px] text-white/50 hover:text-white underline decoration-white/20 hover:decoration-white transition-colors"
                            >
                                Collapse all
                            </button>
                        </div>
                    </div>

                    {/* Stage Timeline Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                        {trace.length === 0 ? (
                            <div className="p-12 text-center text-white/40">
                                No pipeline trace available for this analysis.
                            </div>
                        ) : (
                            trace.map((step) => {
                                const isExpanded = !!expandedStages[step.stage];
                                const StageIcon = STAGE_ICONS[step.stage] || Cpu;

                                return (
                                    <div
                                        key={step.stage}
                                        className="border border-white/10 rounded-2xl bg-white/[0.02] hover:bg-white/[0.03] transition-colors overflow-hidden"
                                    >
                                        {/* Stage Accordion Header */}
                                        <button
                                            type="button"
                                            onClick={() => toggleStage(step.stage)}
                                            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors gap-3"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                                                    <StageIcon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-mono text-amber-400/80 font-bold">
                                                            Stage {step.stage}
                                                        </span>
                                                        <span className="text-sm font-bold text-white truncate">
                                                            {step.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/40 font-mono truncate">
                                                        <FileCode className="w-3 h-3 text-white/30 shrink-0" />
                                                        <span className="text-amber-200/60 truncate">{step.file}</span>
                                                        <span>&rarr;</span>
                                                        <span className="text-white/60 truncate">{step.function}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono font-bold text-white/80">
                                                    {step.duration_ms} ms
                                                </span>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-white/40" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-white/40" />
                                                )}
                                            </div>
                                        </button>

                                        {/* Stage Accordion Body */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-white/5 p-4 bg-black/30 space-y-3"
                                                >
                                                    {/* Code Symbol Reference */}
                                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                                        <span className="text-white/40 font-semibold">Python Class:</span>
                                                        <code className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-amber-300 font-mono text-[11px]">
                                                            {step.class || 'Module Function'}
                                                        </code>
                                                        <span className="text-white/40 font-semibold ml-2">Function:</span>
                                                        <code className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-300 font-mono text-[11px]">
                                                            {step.function}
                                                        </code>
                                                    </div>

                                                    {/* Input / Output Grids */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1">
                                                                <span>📥</span>
                                                                <span>Input Arguments / Context</span>
                                                            </div>
                                                            <pre className="text-[11px] font-mono text-white/70 whitespace-pre-wrap break-words overflow-x-auto">
                                                                {JSON.stringify(step.input, null, 2)}
                                                            </pre>
                                                        </div>

                                                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 mb-1.5 flex items-center gap-1">
                                                                <span>📤</span>
                                                                <span>Computed Outputs / Predictions</span>
                                                            </div>
                                                            <pre className="text-[11px] font-mono text-white/80 whitespace-pre-wrap break-words overflow-x-auto max-h-56">
                                                                {JSON.stringify(step.output, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-white/40">
                        <span className="text-[11px]">
                            NutriFit 3D Food Portion Physical Measurement Engine
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
                        >
                            Close Inspector
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PipelineInspectorModal;

import React from 'react';
import { AlertTriangle, CheckCircle2, Lightbulb, ShieldAlert } from 'lucide-react';

const iconMap = {
    warning: AlertTriangle,
    tip: Lightbulb,
    positive: CheckCircle2,
};

const accentMap = {
    warning: 'text-amber-300 border-amber-400/20 bg-amber-400/10',
    tip: 'text-sky-300 border-sky-400/20 bg-sky-400/10',
    positive: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10',
};

const DiabetesGuidanceWidget = ({ guidance }) => {
    if (!guidance?.primary) return null;

    const primary = guidance.primary;
    const Icon = iconMap[primary.level] || ShieldAlert;
    const accent = accentMap[primary.level] || 'text-white border-white/10 bg-white/10';

    return (
        <div className="col-span-12 lg:col-span-6 bg-linear-to-br from-white/8 to-white/0 border border-white/10 rounded-[2.5rem] p-8">
            <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl border ${accent}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-bold uppercase tracking-widest">
                    Diabetes Guidance
                </span>
            </div>

            <h3 className="text-2xl font-black mb-2">{primary.title}</h3>
            <p className="text-white/65 font-medium mb-4 leading-relaxed">{primary.message}</p>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70 mb-6">
                {primary.action}
            </div>

            <div className="space-y-3">
                {guidance.recommendations.slice(1).map((item) => (
                    <div key={`${item.title}-${item.level}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="font-bold text-sm mb-1">{item.title}</div>
                        <div className="text-sm text-white/55">{item.action}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiabetesGuidanceWidget;


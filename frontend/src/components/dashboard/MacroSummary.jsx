import React from 'react';
import { Flame, Dumbbell, Activity, Droplets } from 'lucide-react';

const MACRO_CONFIG = {
    calories: { label: 'Calories', icon: Flame, color: '#f59e0b', ring: 'from-amber-500/20 to-orange-500/10' },
    protein: { label: 'Protein', icon: Dumbbell, color: '#10b981', ring: 'from-emerald-500/20 to-teal-500/10' },
    carbs: { label: 'Carbs', icon: Activity, color: '#eab308', ring: 'from-yellow-500/20 to-amber-500/10' },
    fat: { label: 'Fat', icon: Droplets, color: '#ec4899', ring: 'from-pink-500/20 to-rose-500/10' },
};

const MacroCard = ({ title, data }) => {
    const config = MACRO_CONFIG[title.toLowerCase()] || {
        label: title,
        icon: Flame,
        color: data.color || '#f59e0b',
        ring: 'from-white/10 to-transparent',
    };
    const Icon = config.icon;

    const hasTarget = Number.isFinite(data.target) && data.target > 0;
    const currentVal = Math.round(data.current || 0);
    const targetVal = hasTarget ? Math.round(data.target) : 0;
    const percentage = hasTarget ? Math.min(Math.round((currentVal / targetVal) * 100), 100) : 0;
    const remaining = hasTarget ? Math.max(0, targetVal - currentVal) : 0;

    return (
        <div className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 p-5 rounded-[2rem] flex flex-col justify-between min-h-[160px] relative overflow-hidden group transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-black/30">
            {/* Top Row: Icon + Label + Target */}
            <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center border"
                        style={{
                            backgroundColor: `${config.color}15`,
                            borderColor: `${config.color}35`,
                            color: config.color,
                        }}
                    >
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-white/60">
                        {config.label}
                    </span>
                </div>

                {hasTarget && (
                    <span className="text-[11px] font-bold text-white/40 font-mono">
                        {targetVal} {data.unit || 'g'}
                    </span>
                )}
            </div>

            {/* Middle: Big Stat */}
            <div className="z-10 my-1">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white font-mono tracking-tight">
                        {currentVal}
                    </span>
                    <span className="text-xs font-semibold text-white/40">
                        {data.unit || 'g'}
                    </span>
                </div>

                {hasTarget && (
                    <div className="text-[10px] font-semibold text-white/40 mt-0.5">
                        {remaining > 0 ? `${remaining} ${data.unit || 'g'} left` : 'Goal reached 🎉'}
                    </div>
                )}
            </div>

            {/* Bottom Progress Bar */}
            <div className="z-10">
                {hasTarget ? (
                    <div className="space-y-1">
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ backgroundColor: config.color, width: `${percentage}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[9px] font-extrabold text-white/30 uppercase tracking-wider">
                            <span>0%</span>
                            <span>{percentage}%</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs font-bold text-white/35 uppercase tracking-widest">{data.unit}</div>
                )}
            </div>

            {/* Decorative colored ambient glow */}
            <div
                className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full blur-[35px] opacity-15 transition-opacity duration-300 group-hover:opacity-25 pointer-events-none"
                style={{ backgroundColor: config.color }}
            />
        </div>
    );
};

const MacroSummary = ({ macros }) => {
    return (
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(macros).map(([key, value]) => (
                <MacroCard
                    key={key}
                    title={key}
                    data={value}
                />
            ))}
        </div>
    );
};

export default MacroSummary;

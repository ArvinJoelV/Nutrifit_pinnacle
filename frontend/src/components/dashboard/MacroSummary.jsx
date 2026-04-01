import React from 'react';

const MacroCard = ({ title, data }) => {
    const hasTarget = Number.isFinite(data.target) && data.target > 0;
    const percentage = hasTarget ? Math.min((data.current / data.target) * 100, 100) : 0;

    return (
        <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex flex-col justify-between h-40 relative overflow-hidden group hover:bg-white/10 transition-colors duration-300">
            <div className="flex justify-between items-start z-10">
                <span className="text-xs font-bold uppercase tracking-widest text-white/40">{title}</span>
                {hasTarget ? <span className="text-xs font-bold text-white/40">{data.displayTarget ?? data.target}{data.unit}</span> : null}
            </div>

            <div className="z-10">
                <div className="text-3xl font-black mb-1">{data.displayCurrent ?? data.current}</div>
                {hasTarget ? (
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{ backgroundColor: data.color, width: `${percentage}%` }}
                        />
                    </div>
                ) : (
                    <div className="text-xs font-bold text-white/35 uppercase tracking-widest">{data.unit}</div>
                )}
            </div>

            {/* Decorative colored glow */}
            <div
                className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-20 transition-opacity duration-300 group-hover:opacity-30"
                style={{ backgroundColor: data.color }}
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

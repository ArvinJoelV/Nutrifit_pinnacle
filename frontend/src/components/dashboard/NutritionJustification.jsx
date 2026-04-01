import React from 'react';

const NutritionJustification = ({ plan }) => {
    const explanations = plan?.explanations;
    if (!explanations) return null;

    return (
        <div className="col-span-12 bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
            <div className="mb-6">
                <h3 className="text-xl font-bold">Why These Targets?</h3>
                <p className="text-sm text-white/45 mt-1">
                    These goals are derived from your diabetes profile, body data, activity, and weight goal.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="text-xs font-bold uppercase tracking-widest text-white/35 mb-2">Calories</div>
                    <p className="text-sm text-white/70 leading-relaxed">{explanations.calories}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="text-xs font-bold uppercase tracking-widest text-white/35 mb-2">Carbs</div>
                    <p className="text-sm text-white/70 leading-relaxed">{explanations.carbs}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="text-xs font-bold uppercase tracking-widest text-white/35 mb-2">Protein</div>
                    <p className="text-sm text-white/70 leading-relaxed">{explanations.protein}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="text-xs font-bold uppercase tracking-widest text-white/35 mb-2">Fat</div>
                    <p className="text-sm text-white/70 leading-relaxed">{explanations.fat}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="text-xs font-bold uppercase tracking-widest text-white/35 mb-2">Fiber</div>
                    <p className="text-sm text-white/70 leading-relaxed">{explanations.fiber}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="text-xs font-bold uppercase tracking-widest text-white/35 mb-2">Sodium</div>
                    <p className="text-sm text-white/70 leading-relaxed">{explanations.sodium}</p>
                </div>
            </div>
        </div>
    );
};

export default NutritionJustification;


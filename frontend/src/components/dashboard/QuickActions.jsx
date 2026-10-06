import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Search, Sparkles, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuickActions = ({ nextMealType }) => {
    const navigate = useNavigate();

    const resolveMealType = () => {
        if (nextMealType) return nextMealType;
        try {
            const cached = JSON.parse(localStorage.getItem('nutrifit_cached_meal_targets') || '{}');
            const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
            const first = mealOrder.find((m) => cached[m] && Number(cached[m].calories || 0) > 0);
            if (first) return first.charAt(0).toUpperCase() + first.slice(1);
        } catch (e) {}
        const hour = new Date().getHours();
        if (hour < 11) return 'Breakfast';
        if (hour < 15) return 'Lunch';
        if (hour < 20) return 'Dinner';
        return 'Snack';
    };

    const targetMeal = resolveMealType();

    return (
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
            {/* Primary Action: Photo Log */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/log/photo', { state: { mealType: targetMeal } })}
                className="bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-400 text-black p-5.5 rounded-[2rem] flex flex-col items-start justify-between min-h-[160px] relative overflow-hidden group cursor-pointer shadow-lg shadow-amber-400/20"
            >
                <div className="bg-black/10 p-3 rounded-2xl group-hover:bg-black/15 transition-colors">
                    <Camera className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                    <span className="block text-xl font-black tracking-tight leading-tight">Photo Log</span>
                    <span className="text-[11px] font-extrabold opacity-70 uppercase tracking-widest mt-0.5 block">
                        Snap & Track
                    </span>
                </div>
                <div className="absolute -right-4 -bottom-4 bg-black/5 w-24 h-24 rounded-full pointer-events-none" />
            </motion.button>

            {/* Secondary Actions Stack */}
            <div className="flex flex-col gap-3 h-full justify-between">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/log/search', { state: { mealType: targetMeal } })}
                    className="flex-1 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-[1.75rem] px-4 py-3 flex items-center justify-between transition-all text-left cursor-pointer group shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl group-hover:bg-white/10 transition-colors">
                            <Search className="w-4 h-4 text-white/80" />
                        </div>
                        <span className="font-extrabold text-sm text-white">Search Food</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/plan')}
                    className="flex-1 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-[1.75rem] px-4 py-3 flex items-center justify-between transition-all text-left cursor-pointer group shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-400/10 border border-amber-400/20 rounded-xl group-hover:bg-amber-400/20 transition-colors">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="font-extrabold text-sm text-white">Meal Plan</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-amber-400 transition-colors" />
                </motion.button>
            </div>
        </div>
    );
};

export default QuickActions;

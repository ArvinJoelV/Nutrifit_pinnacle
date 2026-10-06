import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Plus, ChevronRight, Utensils, Flame, Sparkles, Scale } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:9510';

const MEAL_TYPE_CONFIG = {
    breakfast: { label: 'Breakfast', icon: '🌅', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    lunch: { label: 'Lunch', icon: '☀️', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    dinner: { label: 'Dinner', icon: '🌙', color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
    snack: { label: 'Snack', icon: '🍎', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
};

const getMealTitle = (meal) => {
    if (meal.name && meal.name !== 'Breakfast' && meal.name !== 'Lunch' && meal.name !== 'Dinner' && meal.name !== 'Snack') {
        return meal.name;
    }
    if (Array.isArray(meal.items) && meal.items.length > 0) {
        return meal.items.map((item) => item.name).slice(0, 2).join(', ');
    }
    if (meal.type) {
        return meal.type.charAt(0).toUpperCase() + meal.type.slice(1);
    }
    return 'Logged Meal';
};

const getMealImage = (meal) => {
    let img = null;
    if (meal.image) img = meal.image;
    else if (Array.isArray(meal.items) && meal.items[0]?.image) img = meal.items[0].image;

    if (img && img.startsWith('static/')) {
        return `${API_BASE_URL.replace(/\/$/, '')}/${img}`;
    }
    return img;
};

const getMealCalories = (meal) => meal.calories ?? meal.totalCalories ?? meal.macros?.calories ?? 0;

const MealThumbnail = ({ meal }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const imageUrl = getMealImage(meal);
    const rawType = (meal.type || meal.items?.[0]?.mealType || 'snack').toLowerCase();
    const config = MEAL_TYPE_CONFIG[rawType] || MEAL_TYPE_CONFIG.snack;

    if (!imageUrl || imgFailed) {
        return (
            <div className={`w-12 h-12 rounded-2xl border flex flex-col items-center justify-center shrink-0 shadow-sm ${config.color}`}>
                <span className="text-xl leading-none">{config.icon}</span>
            </div>
        );
    }

    return (
        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shrink-0 relative bg-black/40 shadow-sm">
            <img
                src={imageUrl}
                alt={getMealTitle(meal)}
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
        </div>
    );
};

const RecentMeals = ({ meals = [] }) => {
    const navigate = useNavigate();

    return (
        <div className="col-span-12 bg-white/[0.03] hover:bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-7 md:p-8 backdrop-blur-xl shadow-xl shadow-black/20 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                            <span>Recent Meals</span>
                            {meals.length > 0 && (
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                                    {meals.length} Logged
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-white/40 mt-0.5">Your recorded meals and nutritional impact for today</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/log/photo')}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    title="Log a new meal with photo"
                >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Log Meal</span>
                </button>
            </div>

            {/* Meal Cards Grid */}
            {meals.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center bg-black/20 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3">
                        <Utensils className="w-7 h-7" />
                    </div>
                    <h4 className="font-extrabold text-base text-white mb-1.5">No meals logged yet today</h4>
                    <p className="text-xs text-white/40 mb-5 max-w-sm">
                        Snap a photo or search food items to track your glucose impact and daily macro split.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/log/photo')}
                        className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-xs shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform cursor-pointer"
                    >
                        Log Your First Meal
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                    {meals.map((meal, idx) => {
                        const rawType = (meal.type || meal.items?.[0]?.mealType || 'snack').toLowerCase();
                        const config = MEAL_TYPE_CONFIG[rawType] || MEAL_TYPE_CONFIG.snack;
                        const calories = Math.round(getMealCalories(meal));
                        const carbs = Math.round(meal.macros?.carbs ?? meal.carbs ?? 0);
                        const protein = Math.round(meal.macros?.protein ?? meal.protein ?? 0);
                        const fat = Math.round(meal.macros?.fat ?? meal.fat ?? 0);
                        const totalMass = meal.total_mass_g ? Math.round(meal.total_mass_g) : null;

                        return (
                            <motion.div
                                key={meal.id || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => meal.id && navigate(`/meal/${meal.id}`)}
                                className="group relative flex flex-col justify-between p-4.5 rounded-3xl bg-black/30 hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-black/50"
                            >
                                <div>
                                    {/* Top Row: Thumbnail + Title + Meal Type Badge */}
                                    <div className="flex items-start gap-3.5 mb-3.5">
                                        <MealThumbnail meal={meal} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${config.color}`}>
                                                    {config.label}
                                                </span>
                                                {meal.time && (
                                                    <div className="flex items-center gap-1 text-[11px] text-white/40 font-medium">
                                                        <Clock className="w-3 h-3 text-white/30" />
                                                        <span>{meal.time}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="font-extrabold text-sm text-white truncate group-hover:text-amber-300 transition-colors">
                                                {getMealTitle(meal)}
                                            </h4>
                                        </div>
                                    </div>

                                    {/* Energy Callout */}
                                    <div className="flex items-baseline justify-between mb-3 px-0.5">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="font-black text-2xl text-white font-mono leading-none group-hover:text-amber-400 transition-colors">
                                                {calories}
                                            </span>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">
                                                kcal
                                            </span>
                                        </div>
                                        {totalMass && (
                                            <span className="text-[11px] font-semibold text-amber-300/80 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                                                ⚖️ {totalMass}g
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Row: Macro Pills + Arrow */}
                                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-semibold text-white/50">
                                    <div className="flex items-center gap-2">
                                        <span className="text-amber-400/90">{carbs}g C</span>
                                        <span className="text-white/20">•</span>
                                        <span className="text-emerald-400/90">{protein}g P</span>
                                        <span className="text-white/20">•</span>
                                        <span className="text-rose-400/90">{fat}g F</span>
                                    </div>
                                    <div className="w-7 h-7 rounded-xl bg-white/5 group-hover:bg-amber-400/10 border border-white/5 group-hover:border-amber-400/20 flex items-center justify-center text-white/30 group-hover:text-amber-400 transition-all">
                                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RecentMeals;

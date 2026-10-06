import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Sparkles,
    Trash2,
    Minus,
    Plus,
    Utensils,
    Info,
    Check,
    Flame,
    Weight,
} from 'lucide-react';

const ITEM_THEMES = [
    {
        thumbBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        sliderAccent: '#f59e0b',
        sliderClass: 'accent-amber-400',
    },
    {
        thumbBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        sliderAccent: '#a855f7',
        sliderClass: 'accent-purple-400',
    },
    {
        thumbBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        sliderAccent: '#06b6d4',
        sliderClass: 'accent-cyan-400',
    },
    {
        thumbBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        sliderAccent: '#10b981',
        sliderClass: 'accent-emerald-400',
    },
];

const ItemThumbnail = ({ image, theme }) => {
    const [failed, setFailed] = useState(false);

    if (!image || failed) {
        return (
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${theme.thumbBg} shadow-sm`}>
                <Utensils className="w-5 h-5 opacity-90" />
            </div>
        );
    }

    return (
        <img
            src={image}
            alt=""
            onError={() => setFailed(true)}
            className="w-11 h-11 rounded-2xl object-cover border border-white/15 shrink-0 shadow-sm"
        />
    );
};

const EnhancedPortionEditor = ({
    items = [],
    onUpdateItem,
    onDeleteItem = () => {},
    onAutoAdjust = () => {},
    onConfirm,
    confidence = 0.92,
    highlightedItemId = null,
    onHoverItem = () => {},
}) => {
    const handleSliderChange = (id, e) => {
        const val = parseFloat(e.target.value);
        onUpdateItem(id, val);
    };

    const adjustMultiplier = (id, current, delta) => {
        const next = Math.max(0.25, Math.min(3, Math.round((current + delta) * 20) / 20));
        onUpdateItem(id, next);
    };

    // Calculate aggregate totals
    const totalCalories = Math.round(
        items.reduce((sum, item) => sum + (item.calories * (item.multiplier || 1)), 0)
    );
    const totalMass = Math.round(
        items.reduce((sum, item) => sum + ((item.mass_g || 150) * (item.multiplier || 1)), 0)
    );
    const totalProtein = Math.round(
        items.reduce((sum, item) => sum + (item.protein * (item.multiplier || 1)), 0)
    );
    const totalCarbs = Math.round(
        items.reduce((sum, item) => sum + (item.carbs * (item.multiplier || 1)), 0)
    );
    const totalFat = Math.round(
        items.reduce((sum, item) => sum + (item.fat * (item.multiplier || 1)), 0)
    );

    const macroSum = totalProtein + totalCarbs + totalFat || 1;
    const proteinPct = Math.round((totalProtein / macroSum) * 100);
    const carbsPct = Math.round((totalCarbs / macroSum) * 100);
    const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

    // SVG Donut Chart parameters
    const size = 96;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const proteinOffset = 0;
    const proteinLength = (proteinPct / 100) * circumference;

    const carbsOffset = proteinLength;
    const carbsLength = (carbsPct / 100) * circumference;

    const fatOffset = proteinLength + carbsLength;
    const fatLength = (fatPct / 100) * circumference;

    return (
        <div className="flex flex-col h-full gap-5">
            {/* Header: Item Count & Auto-Adjust Button */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xl font-black text-white tracking-tight">
                    Detected Items <span className="text-white/40 font-bold text-base">({items.length})</span>
                </h3>

                <button
                    type="button"
                    onClick={onAutoAdjust}
                    title="Automatically scale portions to fit your personalized daily macro budget"
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-amber-400/10 cursor-pointer group"
                >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
                    <span>Auto-adjust</span>
                </button>
            </div>

            {/* Scrollable Item Cards List */}
            <div className="max-h-[300px] xl:max-h-[340px] overflow-y-auto space-y-3 pr-1.5 custom-scrollbar">
                {items.length === 0 ? (
                    <div className="p-8 text-center text-white/40 border border-white/5 rounded-3xl bg-black/20">
                        No food items detected. Retake photo or add manually.
                    </div>
                ) : (
                    items.map((item, idx) => {
                        const theme = ITEM_THEMES[idx % ITEM_THEMES.length];
                        const multiplier = item.multiplier || 1;
                        const mass = Math.round((item.mass_g || 150) * multiplier);
                        const cals = Math.round(item.calories * multiplier);

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.06 }}
                                className="rounded-2xl p-4 border transition-all duration-300 relative bg-white/[0.04] border-white/10 hover:bg-white/[0.06] hover:border-white/15"
                            >
                                {/* Card Top Row: Thumbnail, Name, Subtitle, Calories, Trash */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <ItemThumbnail image={item.image} theme={theme} />

                                        <div className="min-w-0">
                                            <h4 className="font-extrabold text-sm text-white truncate leading-tight">
                                                {item.name}
                                            </h4>
                                            <p className="text-[11px] text-white/50 truncate mt-0.5">
                                                {item.detectedLabel || 'Portion analyzed with 3D volume'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-right">
                                            <span className="font-black text-base text-white block leading-none">
                                                {cals}
                                            </span>
                                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                                                kcal
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onDeleteItem(item.id)}
                                            title="Remove item"
                                            className="p-1.5 rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1 cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Slider Row: Portion Grams, Slider, - / + Buttons, Multiplier */}
                                <div className="space-y-1.5 mb-2.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/60 font-medium">
                                            Portion: <span className="font-bold text-white">{mass} g</span>
                                        </span>
                                        <span className="font-mono font-extrabold text-[11px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/90">
                                            {multiplier.toFixed(1)}x
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => adjustMultiplier(item.id, multiplier, -0.1)}
                                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>

                                        <input
                                            type="range"
                                            min="0.25"
                                            max="3.0"
                                            step="0.05"
                                            value={multiplier}
                                            onChange={(e) => handleSliderChange(item.id, e)}
                                            className={`flex-1 h-2 rounded-lg bg-white/10 appearance-none cursor-pointer ${theme.sliderClass}`}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => adjustMultiplier(item.id, multiplier, 0.1)}
                                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Macro Badges Row */}
                                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/5 text-[11px]">
                                    <div className="flex items-center gap-1.5 text-white/70">
                                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                                        <span>Protein</span>
                                        <span className="font-bold text-white ml-auto">{Math.round(item.protein * multiplier)}g</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-white/70">
                                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                                        <span>Carbs</span>
                                        <span className="font-bold text-white ml-auto">{Math.round(item.carbs * multiplier)}g</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-white/70">
                                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                                        <span>Fat</span>
                                        <span className="font-bold text-white ml-auto">{Math.round(item.fat * multiplier)}g</span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Meal Nutrition Estimate Card */}
            <div className="rounded-3xl border border-white/10 bg-black/35 backdrop-blur-md p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-white">Meal Nutrition Estimate</h4>
                        <Info className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                        Confidence: {Math.round(confidence * 100)}%
                    </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                    {/* Left: Total Calories & Grams */}
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white tracking-tight">
                                {totalCalories}
                            </span>
                            <span className="text-sm font-semibold text-white/50">kcal</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-amber-300/90 font-semibold mt-1">
                            <Weight className="w-3.5 h-3.5 text-amber-400" />
                            <span>{totalMass} g total portion</span>
                        </div>
                    </div>

                    {/* Center: SVG Donut Chart */}
                    <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                            {/* Background Track */}
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                stroke="rgba(255,255,255,0.08)"
                                strokeWidth={strokeWidth}
                                fill="none"
                            />
                            {/* Protein Arc (Rose) */}
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                stroke="#f43f5e"
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeDasharray={`${proteinLength} ${circumference}`}
                                strokeDashoffset={-proteinOffset}
                                strokeLinecap="round"
                            />
                            {/* Carbs Arc (Amber) */}
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                stroke="#f59e0b"
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeDasharray={`${carbsLength} ${circumference}`}
                                strokeDashoffset={-carbsOffset}
                                strokeLinecap="round"
                            />
                            {/* Fat Arc (Purple) */}
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                stroke="#a855f7"
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeDasharray={`${fatLength} ${circumference}`}
                                strokeDashoffset={-fatOffset}
                                strokeLinecap="round"
                            />
                        </svg>

                        {/* Center Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Flame className="w-4 h-4 text-amber-400" />
                        </div>
                    </div>

                    {/* Right: Legend Breakdown */}
                    <div className="space-y-1.5 text-[11px] font-medium shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
                            <span className="text-white/60">Protein</span>
                            <span className="font-bold text-white ml-auto">{totalProtein}g ({proteinPct}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                            <span className="text-white/60">Carbs</span>
                            <span className="font-bold text-white ml-auto">{totalCarbs}g ({carbsPct}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                            <span className="text-white/60">Fat</span>
                            <span className="font-bold text-white ml-auto">{totalFat}g ({fatPct}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Primary Action Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                disabled={items.length === 0}
                className="w-full py-4 rounded-2xl bg-linear-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-base shadow-xl shadow-amber-400/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>Confirm Meal</span>
            </motion.button>
        </div>
    );
};

export default EnhancedPortionEditor;

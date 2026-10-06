import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Flame,
    Activity,
    Dumbbell,
    Droplets,
    Leaf,
    ShieldAlert,
    Brain,
    Sparkles,
    CheckCircle2,
    Info,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

const NutritionJustification = ({ plan }) => {
    const explanations = plan?.explanations;
    if (!explanations) return null;

    const cards = [
        {
            key: 'calories',
            title: 'Daily Energy Target',
            target: `${plan.target_calories ? Math.round(plan.target_calories) : '--'} kcal`,
            tag: plan.bmr ? `BMR ~${Math.round(plan.bmr)} • TDEE ~${Math.round(plan.tdee || plan.target_calories)}` : 'Metabolic Energy',
            icon: Flame,
            color: 'amber',
            borderClass: 'border-amber-500/20 hover:border-amber-500/40',
            bgClass: 'bg-amber-500/[0.04]',
            badgeClass: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
            iconClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
            text: explanations.calories,
            clinicalNote: 'Mifflin-St Jeor equation adjusted for wearable active expenditure and weight target.',
        },
        {
            key: 'carbs',
            title: 'Carbohydrate Budget',
            target: `${plan.carbs_g ? Math.round(plan.carbs_g) : '--'} g`,
            tag: 'Glycemic Stability',
            icon: Activity,
            color: 'yellow',
            borderClass: 'border-yellow-500/20 hover:border-yellow-500/40',
            bgClass: 'bg-yellow-500/[0.04]',
            badgeClass: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/20',
            iconClass: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
            text: explanations.carbs,
            clinicalNote: 'Calibrated to prevent acute glucose spikes and maintain postprandial glycemic control.',
        },
        {
            key: 'protein',
            title: 'Protein Intake',
            target: `${plan.protein_g ? Math.round(plan.protein_g) : '--'} g`,
            tag: 'Lean Muscle & Satiety',
            icon: Dumbbell,
            color: 'emerald',
            borderClass: 'border-emerald-500/20 hover:border-emerald-500/40',
            bgClass: 'bg-emerald-500/[0.04]',
            badgeClass: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
            iconClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
            text: explanations.protein,
            clinicalNote: 'Preserves lean muscle mass and triggers satiety hormones to prevent overeating.',
        },
        {
            key: 'fat',
            title: 'Dietary Fat Ceiling',
            target: `${plan.fat_g ? Math.round(plan.fat_g) : '--'} g`,
            tag: 'Hormone & Cardio Safety',
            icon: Droplets,
            color: 'purple',
            borderClass: 'border-purple-500/20 hover:border-purple-500/40',
            bgClass: 'bg-purple-500/[0.04]',
            badgeClass: 'bg-purple-400/10 text-purple-300 border-purple-400/20',
            iconClass: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
            text: explanations.fat,
            clinicalNote: 'Provides essential fatty acids while limiting saturated fat to safeguard cardiovascular health.',
        },
        {
            key: 'fiber',
            title: 'Dietary Fiber Goal',
            target: `${plan.fiber_g ? Math.round(plan.fiber_g) : '30'} g`,
            tag: 'Glucose Absorption Blunting',
            icon: Leaf,
            color: 'teal',
            borderClass: 'border-teal-500/20 hover:border-teal-500/40',
            bgClass: 'bg-teal-500/[0.04]',
            badgeClass: 'bg-teal-400/10 text-teal-300 border-teal-400/20',
            iconClass: 'text-teal-400 bg-teal-500/15 border-teal-500/30',
            text: explanations.fiber,
            clinicalNote: 'Soluble viscous fiber slows gastric emptying and reduces intestinal carbohydrate absorption rate.',
        },
        {
            key: 'sodium',
            title: 'Sodium Ceiling',
            target: `< ${plan.sodium_limit_mg || 2300} mg`,
            tag: 'Vascular Protection',
            icon: ShieldAlert,
            color: 'cyan',
            borderClass: 'border-cyan-500/20 hover:border-cyan-500/40',
            bgClass: 'bg-cyan-500/[0.04]',
            badgeClass: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
            iconClass: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
            text: explanations.sodium,
            clinicalNote: 'Strict sodium ceiling to mitigate hypertension risk and renal microvascular pressure.',
        },
    ];

    return (
        <div className="col-span-12 bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-7 md:p-9 backdrop-blur-xl shadow-xl shadow-black/20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0">
                        <Brain className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-2xl font-black text-white tracking-tight">
                                Why These Targets?
                            </h3>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                <span>Clinical AI Personalization</span>
                            </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1 max-w-2xl leading-relaxed">
                            These nutrition thresholds are deterministically calculated for your metabolic baseline, diabetic glycemic thresholds, Google Fit active burn, and weight goal.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Mifflin-St Jeor + Wearable Sync</span>
                    </div>
                </div>
            </div>

            {/* 6 Science-Backed Macro Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {cards.map((card, idx) => {
                    const Icon = card.icon;

                    return (
                        <motion.div
                            key={card.key}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`rounded-3xl border ${card.borderClass} ${card.bgClass} p-5.5 transition-all duration-300 flex flex-col justify-between hover:shadow-lg hover:shadow-black/30 group`}
                        >
                            <div>
                                {/* Top Row: Icon, Title, and Value Badge */}
                                <div className="flex items-start justify-between gap-3 mb-3.5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${card.iconClass}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-extrabold text-sm text-white truncate">
                                                {card.title}
                                            </h4>
                                            <span className="text-[10px] font-medium text-white/40 block truncate">
                                                {card.tag}
                                            </span>
                                        </div>
                                    </div>

                                    <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-xl border shrink-0 ${card.badgeClass}`}>
                                        {card.target}
                                    </span>
                                </div>

                                {/* Clinical Justification Text */}
                                <p className="text-xs text-white/75 leading-relaxed mb-3">
                                    {card.text}
                                </p>
                            </div>

                            {/* Scientific Bottom Note */}
                            <div className="pt-3 border-t border-white/5 flex items-center gap-1.5 text-[10px] font-medium text-white/40">
                                <Info className="w-3 h-3 text-white/30 shrink-0" />
                                <span className="line-clamp-1">{card.clinicalNote}</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default NutritionJustification;

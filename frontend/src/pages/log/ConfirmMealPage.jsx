import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Clock,
    Flame,
    Minus,
    Plus,
    Save,
    Sparkles,
    Trash2,
    Utensils,
    X,
    Check,
    Scale,
    Layers,
    Cpu
} from 'lucide-react';
import PipelineInspectorModal from '../../components/log/PipelineInspectorModal';
import { getDailyStats, saveMealLog } from '../../services/mealService';
import { getGoogleFitActivity } from '../../services/googleFitService';
import { runMealLoggedWorkflow } from '../../services/agentService';
import { calculateDiabetesNutritionPlan, getUserProfile } from '../../services/userService';
import { useOnboarding } from '../../contexts/OnboardingContext';

const getCurrentTimeHHMM = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const getSmartDefaultMealType = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 19) return 'snack';
    if (hour >= 19 && hour < 23) return 'dinner';
    return 'snack';
};

const mealTypes = [
    { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { id: 'lunch', label: 'Lunch', icon: '☀️' },
    { id: 'dinner', label: 'Dinner', icon: '🌙' },
    { id: 'snack', label: 'Snack', icon: '🍎' },
];

const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];

const normalizeMealType = (value = '') => {
    const normalized = String(value).trim().toLowerCase();
    if (normalized.startsWith('break')) return 'breakfast';
    if (normalized.startsWith('lunch')) return 'lunch';
    if (normalized.startsWith('din')) return 'dinner';
    if (normalized.startsWith('snack')) return 'snack';
    return 'snack';
};

const getTodayActivity = (rows = []) => {
    const today = new Date().toLocaleDateString('en-CA');
    return [...rows]
        .sort((a, b) => String(b.activity_date || '').localeCompare(String(a.activity_date || '')))
        .find((row) => row.activity_date === today) || rows[0] || {};
};

const addMacros = (left = {}, right = {}) => ({
    calories: Number(left.calories || 0) + Number(right.calories || 0),
    carbs: Number(left.carbs || 0) + Number(right.carbs || 0),
    protein: Number(left.protein || 0) + Number(right.protein || 0),
    fat: Number(left.fat || 0) + Number(right.fat || 0),
});

const ConfirmMealPage = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { formData } = useOnboarding();

    const initialItems = (state?.mealData?.items || []).map(item => ({
        ...item,
        multiplier: item.multiplier || 1,
    }));

    const [items, setItems] = useState(initialItems);
    const [selectedMealType, setSelectedMealType] = useState(
        normalizeMealType(state?.mealData?.items?.[0]?.mealType || getSmartDefaultMealType())
    );
    const [mealTime, setMealTime] = useState(getCurrentTimeHHMM());
    const [isSaving, setIsSaving] = useState(false);
    const [showSegmentedImage, setShowSegmentedImage] = useState(true);
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);

    if (!state?.mealData) {
        return (
            <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-white/40">
                    <Utensils className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No Meal Data Found</h2>
                <p className="text-sm text-white/40 mb-6 max-w-xs">
                    Please upload or snap a photo of your food to analyze and confirm it.
                </p>
                <button
                    onClick={() => navigate('/home')}
                    className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-sm rounded-full shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const segmentedImage = state.mealData.segmentedImage;
    const scaleCalibration = state.mealData.scale_calibration || null;
    const sceneAssessment = state.mealData.scene_assessment || null;
    const pipelineTrace = state.mealData.pipeline_trace || [];
    const pipelineDurationMs = state.mealData.pipeline_duration_ms || 0;

    // Dynamically calculate totals based on user's multiplier adjustments
    const totalCalories = items.reduce(
        (acc, item) => acc + (Number(item.calories) || 0) * (Number(item.multiplier) || 1),
        0
    );

    const totalMass = items.reduce(
        (acc, item) => acc + (Number(item.mass_g) || 0) * (Number(item.multiplier) || 1),
        0
    );

    const macros = items.reduce(
        (acc, item) => {
            const mult = Number(item.multiplier) || 1;
            return {
                protein: acc.protein + (Number(item.protein) || 0) * mult,
                carbs: acc.carbs + (Number(item.carbs) || 0) * mult,
                fat: acc.fat + (Number(item.fat) || 0) * mult,
            };
        },
        { protein: 0, carbs: 0, fat: 0 }
    );

    const macroTotalGrams = (macros.protein + macros.carbs + macros.fat) || 1;
    const carbPercent = Math.round((macros.carbs / macroTotalGrams) * 100);
    const proteinPercent = Math.round((macros.protein / macroTotalGrams) * 100);
    const fatPercent = Math.round((macros.fat / macroTotalGrams) * 100);

    const updateMultiplier = (index, delta) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== index) return item;
            const newMultiplier = Math.max(0.25, Math.min(5, Math.round(((item.multiplier || 1) + delta) * 4) / 4));
            return { ...item, multiplier: newMultiplier };
        }));
    };

    const removeItem = (index) => {
        if (items.length <= 1) {
            alert('A meal must have at least one food item.');
            return;
        }
        setItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const [stats, profile, activity] = await Promise.all([
                getDailyStats(),
                getUserProfile().catch(() => null),
                getGoogleFitActivity(7).catch(() => ({ items: [] })),
            ]);

            const latestActivity = getTodayActivity(activity.items || []);
            const resolvedProfile = profile || formData || {};
            const plan = calculateDiabetesNutritionPlan(
                resolvedProfile,
                Number(latestActivity?.calories_burned || 0),
            );
            const latestMealMacros = {
                calories: Math.round(totalCalories),
                carbs: Math.round(macros.carbs),
                protein: Math.round(macros.protein),
                fat: Math.round(macros.fat),
            };
            const consumedMacros = addMacros(stats.totals, latestMealMacros);
            const today = new Date().toLocaleDateString('en-CA');
            const completedMeals = new Set(
                (stats.meals || [])
                    .filter((meal) => meal.localDate === today || meal.date === today)
                    .map((meal) => normalizeMealType(meal.type || meal.items?.[0]?.mealType || ''))
                    .filter((meal) => mealOrder.includes(meal)),
            );
            completedMeals.add(selectedMealType);

            const savedLog = await saveMealLog({
                items: items.map(item => ({
                    ...item,
                    calories: Math.round(item.calories * (item.multiplier || 1)),
                    carbs: Math.round((item.carbs || 0) * (item.multiplier || 1)),
                    protein: Math.round((item.protein || 0) * (item.multiplier || 1)),
                    fat: Math.round((item.fat || 0) * (item.multiplier || 1)),
                    mass_g: item.mass_g != null ? Math.round(item.mass_g * (item.multiplier || 1)) : undefined,
                    estimated_volume_cm3: item.estimated_volume_cm3 != null ? Math.round(item.estimated_volume_cm3 * (item.multiplier || 1)) : undefined,
                })),
                totalCalories: Math.round(totalCalories),
                total_mass_g: totalMass > 0 ? Math.round(totalMass) : undefined,
                macros: latestMealMacros,
                time: mealTime,
                type: selectedMealType,
            });

            try {
                const agentResult = await runMealLoggedWorkflow({
                    dailyMacros: {
                        calories: plan.target_calories,
                        carbs: plan.carbs_g,
                        protein: plan.protein_g,
                        fat: plan.fat_g,
                    },
                    consumedMacros,
                    completedMeals: Array.from(completedMeals),
                    latestMeal: {
                        id: savedLog.id,
                        type: selectedMealType,
                        totalCalories: Math.round(totalCalories),
                        macros: latestMealMacros,
                        items,
                        time: mealTime,
                        timestamp: savedLog.timestamp,
                    },
                    patientProfile: resolvedProfile,
                    activity: latestActivity,
                    topN: 1,
                });

                localStorage.setItem('nutrifit_latest_agent_result', JSON.stringify({
                    cachedAt: new Date().toISOString(),
                    localDate: new Date().toLocaleDateString('en-CA'),
                    result: agentResult,
                }));
                localStorage.setItem('nutrifit_cached_meal_targets', JSON.stringify(agentResult.nextMealTargets || {}));
                localStorage.setItem('nutrifit_cached_agent_message', agentResult.message || '');
            } catch (agentError) {
                console.warn('Agent workflow failed after meal save:', agentError);
            }

            navigate(`/meal/${savedLog.id}`);
        } catch (error) {
            console.error('Save failed:', error);
            alert(`Error saving meal: ${error.message}`);
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070709] text-white flex flex-col pb-32">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px]" />
                <div className="absolute top-1/3 -right-32 w-72 h-72 rounded-full bg-emerald-500/5 blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-lg mx-auto px-5 pt-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">Step 2 of 2</span>
                        <h1 className="text-lg font-black tracking-tight">Confirm & Log Meal</h1>
                    </div>
                    <button
                        onClick={() => navigate('/home')}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white"
                        aria-label="Cancel"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scene Assessment & Calibration Notice */}
                {sceneAssessment && (
                    <div className={`mb-4 px-4 py-3 rounded-2xl border text-xs flex items-center justify-between backdrop-blur-md flex-wrap gap-2 ${
                        sceneAssessment.needs_better_image
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    }`}>
                        <div className="flex items-center gap-2">
                            <span>{sceneAssessment.needs_better_image ? '📸' : '✨'}</span>
                            <span className="font-medium">
                                {sceneAssessment.needs_better_image
                                    ? (sceneAssessment.prompt || 'Tip: Photo at 45° angle with plate rim visible yields higher portion accuracy.')
                                    : `Physics-grounded 3D portion estimation active (${Math.round((sceneAssessment.overall_confidence || 0.8) * 100)}% confidence)`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {scaleCalibration && (
                                <span className="text-[10px] uppercase tracking-wider font-bold bg-white/10 px-2.5 py-1 rounded-full text-white/80 border border-white/10">
                                    {scaleCalibration.plate_detected ? 'Plate Calibrated' : 'Prior Calibrated'}
                                </span>
                            )}
                            {pipelineTrace.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setIsInspectorOpen(true)}
                                    className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
                                    title="View output of each Python file & function"
                                >
                                    <Cpu className="w-3 h-3 text-amber-400" />
                                    <span>Inspect Pipeline</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Hero Nutrition Summary Card */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-500/15 via-white/[0.03] to-white/[0.02] border border-amber-500/25 p-6 mb-6 backdrop-blur-xl shadow-2xl shadow-black/60"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                                <Flame className="w-4 h-4 fill-amber-400/20" />
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
                                Total Energy & Portion
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            {state?.mealData?.execution_target && (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 ${
                                    state.mealData.execution_target.toLowerCase().includes('edge') || state.mealData.execution_target.toLowerCase().includes('c100')
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                                        : 'bg-white/10 text-white/70 border-white/10'
                                }`}>
                                    <Cpu className="w-3 h-3 text-emerald-400" />
                                    {state.mealData.execution_target}
                                </span>
                            )}
                            {pipelineTrace.length > 0 && !sceneAssessment && (
                                <button
                                    type="button"
                                    onClick={() => setIsInspectorOpen(true)}
                                    className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
                                >
                                    <Cpu className="w-3 h-3 text-amber-400" />
                                    <span>Inspect Pipeline</span>
                                </button>
                            )}
                            <span className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/70">
                                {items.length} {items.length === 1 ? 'item' : 'items'} detected
                            </span>
                        </div>
                    </div>

                    <div className="flex items-baseline justify-between mb-6">
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black tracking-tight text-white font-mono">
                                {Math.round(totalCalories)}
                            </span>
                            <span className="text-base font-semibold text-white/50">kcal</span>
                        </div>
                        {totalMass > 0 && (
                            <div className="text-right">
                                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-0.5">Total Weight</div>
                                <div className="text-2xl font-black text-amber-300 font-mono">
                                    {Math.round(totalMass)}<span className="text-sm font-semibold text-white/50 ml-1">g</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Macro Distribution Bar */}
                    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden flex gap-0.5 mb-4">
                        <div style={{ width: `${carbPercent}%` }} className="h-full bg-amber-400 rounded-l-full transition-all duration-300" title={`Carbs: ${carbPercent}%`} />
                        <div style={{ width: `${proteinPercent}%` }} className="h-full bg-emerald-400 transition-all duration-300" title={`Protein: ${proteinPercent}%`} />
                        <div style={{ width: `${fatPercent}%` }} className="h-full bg-rose-400 rounded-r-full transition-all duration-300" title={`Fat: ${fatPercent}%`} />
                    </div>

                    {/* Macro Cards */}
                    <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-3 text-center">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mb-0.5">Carbs</span>
                            <span className="text-lg font-black text-amber-300">{Math.round(macros.carbs)}<span className="text-xs font-medium">g</span></span>
                            <span className="block text-[10px] text-amber-400/60 font-medium">{carbPercent}%</span>
                        </div>
                        <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-2xl p-3 text-center">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 mb-0.5">Protein</span>
                            <span className="text-lg font-black text-emerald-300">{Math.round(macros.protein)}<span className="text-xs font-medium">g</span></span>
                            <span className="block text-[10px] text-emerald-400/60 font-medium">{proteinPercent}%</span>
                        </div>
                        <div className="bg-rose-400/10 border border-rose-400/20 rounded-2xl p-3 text-center">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-300/80 mb-0.5">Fat</span>
                            <span className="text-lg font-black text-rose-300">{Math.round(macros.fat)}<span className="text-xs font-medium">g</span></span>
                            <span className="block text-[10px] text-rose-400/60 font-medium">{fatPercent}%</span>
                        </div>
                    </div>
                </motion.div>

                {/* Meal Window & Time Selector */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-5 mb-6 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/50">Meal Window</span>
                        <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl transition-colors">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <input
                                type="time"
                                value={mealTime}
                                onChange={(e) => setMealTime(e.target.value)}
                                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {mealTypes.map((type) => {
                            const active = selectedMealType === type.id;
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setSelectedMealType(type.id)}
                                    className={`py-2.5 px-2 rounded-2xl font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                                        active
                                            ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/20 scale-[1.02]'
                                            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
                                    }`}
                                >
                                    <span className="text-sm">{type.icon}</span>
                                    <span>{type.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* AI Segmentation Preview */}
                {segmentedImage && (
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl overflow-hidden mb-6 backdrop-blur-md">
                        <button
                            type="button"
                            onClick={() => setShowSegmentedImage(!showSegmentedImage)}
                            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                                    AI Vision Segmentation
                                </span>
                            </div>
                            <span className="text-[11px] font-semibold text-amber-400/80">
                                {showSegmentedImage ? 'Hide' : 'View Mask'}
                            </span>
                        </button>
                        <AnimatePresence>
                            {showSegmentedImage && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="border-t border-white/5 relative"
                                >
                                    <img
                                        src={segmentedImage}
                                        alt="Segmented Meal"
                                        className="w-full h-44 object-cover object-center"
                                    />
                                    <div className="absolute bottom-2 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/80 border border-white/10">
                                        SAM 2 Active
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Food Items Breakdown */}
                <div className="space-y-3 mb-8">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                            Food Items & Portion Adjustments
                        </span>
                        <span className="text-[11px] text-white/40">Use +/- to adjust size</span>
                    </div>

                    {items.map((item, idx) => {
                        const mult = item.multiplier || 1;
                        const itemCals = Math.round((Number(item.calories) || 0) * mult);
                        const itemCarbs = Math.round((Number(item.carbs) || 0) * mult);
                        const itemProtein = Math.round((Number(item.protein) || 0) * mult);
                        const itemFat = Math.round((Number(item.fat) || 0) * mult);

                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] rounded-3xl p-4 transition-colors backdrop-blur-md"
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-11 h-11 rounded-2xl object-cover border border-white/10"
                                            />
                                        ) : (
                                            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                                                🍽️
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-bold text-sm text-white capitalize leading-snug">
                                                {item.name}
                                            </h4>
                                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                <span className="text-xs text-white/40 font-medium">
                                                    {item.serving || '1 portion'}
                                                </span>
                                                {item.mass_g != null && (
                                                    <span className="text-[11px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                                                        ⚖️ {Math.round(item.mass_g * mult)}g
                                                    </span>
                                                )}
                                                {item.estimated_volume_cm3 != null && (
                                                    <span className="text-[10px] text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                        {Math.round(item.estimated_volume_cm3 * mult)} cm³
                                                    </span>
                                                )}
                                            </div>
                                            {Array.isArray(item.mass_range_g) && (
                                                <div className="text-[10px] text-white/35 mt-0.5">
                                                    Est. Range: {Math.round(item.mass_range_g[0] * mult)}–{Math.round(item.mass_range_g[1] * mult)}g
                                                    {item.confidence != null && ` (${Math.round(item.confidence * 100)}% conf)`}
                                                </div>
                                            )}
                                            {item.occlusion_probability > 0.15 && (
                                                <div className="text-[10px] text-amber-300/80 mt-0.5 flex items-center gap-1">
                                                    <span>⚠️</span>
                                                    <span>{Math.round(item.occlusion_probability * 100)}% occluded (reconstructed)</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-mono font-black text-lg text-white">
                                            {itemCals}
                                            <span className="text-xs font-medium text-white/40 ml-1">kcal</span>
                                        </div>
                                        {item.mass_g != null && (
                                            <div className="text-[11px] font-mono text-amber-300/80 font-bold">
                                                {Math.round(item.mass_g * mult)}g
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Macros pill & Portion Stepper */}
                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-[11px] font-semibold text-white/60">
                                        <span className="text-amber-400/90">{itemCarbs}g C</span>
                                        <span className="text-white/20">•</span>
                                        <span className="text-emerald-400/90">{itemProtein}g P</span>
                                        <span className="text-white/20">•</span>
                                        <span className="text-rose-400/90">{itemFat}g F</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5">
                                            <button
                                                type="button"
                                                onClick={() => updateMultiplier(idx, -0.25)}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                                title="Decrease portion"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="px-2 font-mono text-xs font-bold text-white min-w-[42px] text-center">
                                                {mult}x
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateMultiplier(idx, 0.25)}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                                title="Increase portion"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeItem(idx)}
                                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 flex items-center justify-center transition-colors"
                                            title="Remove item"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Floating Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#070709] via-[#070709]/95 to-transparent backdrop-blur-xl border-t border-white/10">
                <div className="max-w-lg mx-auto flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/home')}
                        className="px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-sm text-white/70 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        <span>Discard</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                    >
                        {isSaving ? (
                            <>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="w-4 h-4 border-2 border-black border-t-transparent rounded-full"
                                />
                                <span>Running AI Health Agents...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5 stroke-[3]" />
                                <span>Confirm & Log {Math.round(totalCalories)} kcal</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Full Pipeline Debug Inspector Modal */}
            <PipelineInspectorModal
                isOpen={isInspectorOpen}
                onClose={() => setIsInspectorOpen(false)}
                trace={pipelineTrace}
                durationMs={pipelineDurationMs}
                summaryData={{
                    total_mass_g: totalMass > 0 ? Math.round(totalMass) : null,
                    total_items: items.length,
                    total_calories: Math.round(totalCalories),
                    execution_target: state?.mealData?.execution_target,
                }}
            />
        </div>
    );
};

export default ConfirmMealPage;

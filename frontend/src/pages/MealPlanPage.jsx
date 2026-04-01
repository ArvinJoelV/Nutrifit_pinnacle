import React, { useEffect, useState } from 'react';
import { ArrowRight, ChefHat, Loader2, RefreshCw, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserProfile, calculateDiabetesNutritionPlan } from '../services/userService';
import { generateMealPlan } from '../services/mealPlanService';

const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];

const mealLabels = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
};

const mealNotes = {
    breakfast: 'Start with slower carbs and a steady protein base.',
    lunch: 'Anchor the biggest meal with vegetables and controlled starch.',
    dinner: 'Keep the evening plate lighter without dropping protein.',
    snack: 'Use this slot to smooth glucose swings between meals.',
};

const sectionClass = 'rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl';

const MacroPill = ({ label, value, unit }) => (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</div>
        <div className="mt-2 text-lg font-black text-white">
            {Math.round(Number(value) || 0)}
            <span className="ml-1 text-xs font-medium text-white/45">{unit}</span>
        </div>
    </div>
);

const formatQuantity = (detail) => {
    const quantity = Number(detail?.quantity || 1);
    const portionSizeG = Number(detail?.portion_size_g || 0);
    const basePortionSizeG = Number(detail?.base_portion_size_g || 0);
    const servingSizeLabel = String(detail?.serving_size_label || '').trim();
    const quantityLabel = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1);
    const unitLabel = quantity === 1 ? 'serving' : 'servings';
    if (portionSizeG > 0) {
        if (basePortionSizeG > 0) {
            return `${quantityLabel} ${unitLabel} • serving size ${Math.round(basePortionSizeG)} g • total ${Math.round(portionSizeG)} g`;
        }
        return `${quantityLabel} ${unitLabel} • total ${Math.round(portionSizeG)} g`;
    }
    if (servingSizeLabel) {
        return `${quantityLabel} ${unitLabel} • serving size ${servingSizeLabel}`;
    }
    return `${quantityLabel} ${unitLabel}`;
};

const RecommendationCard = ({ item, index }) => (
    <div className="rounded-[1.6rem] border border-emerald-400/10 bg-linear-to-br from-emerald-400/10 via-white/[0.03] to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
            <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-200/60">Option {index + 1}</div>
                <div className="mt-3 grid gap-3">
                    {(item.ingredientDetails?.length ? item.ingredientDetails : item.ingredients?.map((ingredient) => ({ ingredient })))?.map((detail, itemIndex) => (
                        <div
                            key={`${detail.ingredient}-${itemIndex}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                        >
                            <div>
                                <div className="text-sm font-bold text-white/90">{String(detail.ingredient || '').replace(/_/g, ' ')}</div>
                                {detail.matched_food ? (
                                    <div className="text-xs text-white/40">Matched to {String(detail.matched_food).replace(/_/g, ' ')}</div>
                                ) : null}
                            </div>
                            <div className="rounded-full border border-amber-200/15 bg-amber-200/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-100/80">
                                {formatQuantity(detail)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-right">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-100/55">Score</div>
                <div className="text-2xl font-black text-emerald-100">{Math.round((item.score || 0) * 100)}%</div>
            </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
            <MacroPill label="Calories" value={item.calories} unit="kcal" />
            <MacroPill label="Carbs" value={item.carbs} unit="g" />
            <MacroPill label="Protein" value={item.protein} unit="g" />
            <MacroPill label="Fat" value={item.fat} unit="g" />
            <MacroPill label="Fiber" value={item.fiber} unit="g" />
            <MacroPill label="Sodium" value={item.sodium} unit="mg" />
        </div>
    </div>
);

const MealWindowCard = ({ mealType, target, recommendations }) => (
    <section className={`${sectionClass} overflow-hidden`}>
        <div className="border-b border-white/8 bg-linear-to-r from-white/[0.04] to-transparent px-6 py-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/35">{mealLabels[mealType]}</div>
                    <h2 className="mt-2 text-2xl font-black text-white">{mealLabels[mealType]} allocation</h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">{mealNotes[mealType]}</p>
                </div>
                <div className="rounded-2xl border border-amber-300/15 bg-amber-300/10 px-4 py-3 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-100/55">Target Window</div>
                    <div className="mt-1 text-lg font-black text-amber-50">{Math.round(target?.calories || 0)} kcal</div>
                </div>
            </div>
        </div>

        <div className="p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MacroPill label="Carbs" value={target?.carbs} unit="g" />
                <MacroPill label="Protein" value={target?.protein} unit="g" />
                <MacroPill label="Fat" value={target?.fat} unit="g" />
                <MacroPill label="Calories" value={target?.calories} unit="kcal" />
            </div>

            <div className="mt-6 space-y-4">
                {recommendations?.length ? (
                    recommendations.map((item, index) => (
                        <RecommendationCard key={`${mealType}-${index}`} item={item} index={index} />
                    ))
                ) : (
                    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-6 text-sm text-white/55">
                        No recommendations were returned for this meal window. Check the backend data matching between ingredient categories and the nutrition dataset.
                    </div>
                )}
            </div>
        </div>
    </section>
);

const MealPlanPage = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [dailyMacros, setDailyMacros] = useState(null);
    const [mealTargets, setMealTargets] = useState({});
    const [mealPlan, setMealPlan] = useState({});

    const loadPlan = async ({ isRefresh = false } = {}) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError('');

        try {
            const userProfile = await getUserProfile();
            const computedPlan = calculateDiabetesNutritionPlan(userProfile || {}, 0);
            const macros = {
                calories: computedPlan.target_calories,
                carbs: computedPlan.carbs_g,
                protein: computedPlan.protein_g,
                fat: computedPlan.fat_g,
            };

            const response = await generateMealPlan(macros);
            setProfile(userProfile);
            setDailyMacros(macros);
            setMealTargets(response.meal_targets || {});
            setMealPlan(response.meal_plan || {});
        } catch (err) {
            setError(err.message || 'Unable to load meal plan.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadPlan();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white/70">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Building your meal allocation...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-linear-to-br from-[#10231c] via-[#0f1112] to-[#2b1612] p-8">
                <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-emerald-300/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-amber-200/10 blur-3xl" />
                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white/55">
                            <Sparkles className="h-3.5 w-3.5" />
                            Diabetes Meal Planner
                        </div>
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">Meal allocation with ranked recommendations</h1>
                        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
                            Daily diabetes macros are split into breakfast, lunch, dinner, and snack windows, then matched against candidate meals from the recommendation engine.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => loadPlan({ isRefresh: true })}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/12 disabled:opacity-50"
                        >
                            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Refresh plan
                        </button>
                        <Link
                            to="/profile"
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-50"
                        >
                            Update profile
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {error ? (
                <section className="rounded-[2rem] border border-rose-400/15 bg-rose-400/10 p-6 text-sm text-rose-100">
                    <div className="font-bold uppercase tracking-[0.22em] text-rose-100/70">Meal plan unavailable</div>
                    <p className="mt-3 leading-relaxed">{error}</p>
                    <p className="mt-3 text-rose-100/70">
                        Make sure the Flask backend is running on `http://127.0.0.1:9510` and that the nutrition datasets are accessible from the backend.
                    </p>
                </section>
            ) : null}

            <section className={`${sectionClass} p-6`}>
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
                        <Target className="h-5 w-5 text-amber-100" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/35">Daily targets</div>
                        <div className="text-xl font-black text-white">
                            {profile?.firstName ? `${profile.firstName}'s computed diabetes plan` : 'Computed diabetes plan'}
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <MacroPill label="Calories" value={dailyMacros?.calories} unit="kcal" />
                    <MacroPill label="Carbs" value={dailyMacros?.carbs} unit="g" />
                    <MacroPill label="Protein" value={dailyMacros?.protein} unit="g" />
                    <MacroPill label="Fat" value={dailyMacros?.fat} unit="g" />
                </div>
            </section>

            <section className={`${sectionClass} p-6`}>
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
                        <ChefHat className="h-5 w-5 text-emerald-100" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/35">Meal allocation</div>
                        <div className="text-xl font-black text-white">Macro budget split by meal window</div>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {mealOrder.map((mealType) => (
                        <div key={mealType} className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
                            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">{mealLabels[mealType]}</div>
                            <div className="mt-3 text-3xl font-black text-white">{Math.round(mealTargets?.[mealType]?.calories || 0)}</div>
                            <div className="text-sm text-white/40">kcal allocation</div>
                            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-2 py-3">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">C</div>
                                    <div className="mt-1 text-sm font-black">{Math.round(mealTargets?.[mealType]?.carbs || 0)}g</div>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-2 py-3">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">P</div>
                                    <div className="mt-1 text-sm font-black">{Math.round(mealTargets?.[mealType]?.protein || 0)}g</div>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-2 py-3">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">F</div>
                                    <div className="mt-1 text-sm font-black">{Math.round(mealTargets?.[mealType]?.fat || 0)}g</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="space-y-6">
                {mealOrder.map((mealType) => (
                    <MealWindowCard
                        key={mealType}
                        mealType={mealType}
                        target={mealTargets?.[mealType]}
                        recommendations={mealPlan?.[mealType]?.recommendations || []}
                    />
                ))}
            </div>
        </div>
    );
};

export default MealPlanPage;

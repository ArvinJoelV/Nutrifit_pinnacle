import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Search, ChevronRight, Loader2 } from 'lucide-react';
import { getDailyStats } from '../services/mealService';
import { getUserProfile, calculateDiabetesNutritionPlan } from '../services/userService';
import { getGoogleFitActivity } from '../services/googleFitService';
import { useOnboarding } from '../contexts/OnboardingContext';

const LogFoodPage = () => {
    const navigate = useNavigate();
    const { formData } = useOnboarding();

    const [isLoadingTargets, setIsLoadingTargets] = useState(true);
    const [availableMeals, setAvailableMeals] = useState(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
    const [upcomingTargets, setUpcomingTargets] = useState({});
    const [selectedMealType, setSelectedMealType] = useState('');

    useEffect(() => {
        let isMounted = true;
        const loadTargets = async () => {
            setIsLoadingTargets(true);
            try {
                const [stats, profile, activity] = await Promise.all([
                    getDailyStats().catch(() => ({ totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, meals: [] })),
                    getUserProfile().catch(() => null),
                    getGoogleFitActivity(7).catch(() => ({ items: [] }))
                ]);
                if (!isMounted) return;

                const today = new Date().toLocaleDateString('en-CA');
                const todaysMeals = (stats?.meals || []).filter(m => m.localDate === today || m.date === today);

                const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
                const buckets = mealOrder.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});
                todaysMeals.forEach((meal) => {
                    const key = String(meal.type || meal.items?.[0]?.mealType || '').trim().toLowerCase();
                    const normalized = key.startsWith('break') ? 'breakfast' : key.startsWith('lunch') ? 'lunch' : key.startsWith('din') ? 'dinner' : key.startsWith('snack') ? 'snack' : key;
                    if (buckets[normalized] !== undefined) buckets[normalized] += Number(meal.totalCalories || 0);
                });

                const completed = mealOrder.filter(m => buckets[m] > 0);
                const remaining = mealOrder.filter(m => buckets[m] === 0);

                const resolvedProfile = profile || formData || {};
                let latestActivity = null;
                if (activity && Array.isArray(activity.items)) {
                    latestActivity = activity.items.sort((a, b) => String(b.activity_date).localeCompare(String(a.activity_date))).find(r => r.activity_date === today) || activity.items[0];
                }

                const plan = calculateDiabetesNutritionPlan(resolvedProfile, Number(latestActivity?.calories_burned || 0));

                const cachedTargets = JSON.parse(localStorage.getItem('nutrifit_cached_meal_targets') || '{}');

                const mealSplitRatios = {
                    breakfast: 0.25,
                    lunch: 0.35,
                    dinner: 0.30,
                    snack: 0.10,
                };

                const baseTargets = {
                    breakfast: {
                        calories: plan.target_calories * mealSplitRatios.breakfast,
                        carbs: plan.carbs_g * mealSplitRatios.breakfast,
                        protein: plan.protein_g * mealSplitRatios.breakfast,
                        fat: plan.fat_g * mealSplitRatios.breakfast,
                    },
                    lunch: {
                        calories: plan.target_calories * mealSplitRatios.lunch,
                        carbs: plan.carbs_g * mealSplitRatios.lunch,
                        protein: plan.protein_g * mealSplitRatios.lunch,
                        fat: plan.fat_g * mealSplitRatios.lunch,
                    },
                    dinner: {
                        calories: plan.target_calories * mealSplitRatios.dinner,
                        carbs: plan.carbs_g * mealSplitRatios.dinner,
                        protein: plan.protein_g * mealSplitRatios.dinner,
                        fat: plan.fat_g * mealSplitRatios.dinner,
                    },
                    snack: {
                        calories: plan.target_calories * mealSplitRatios.snack,
                        carbs: plan.carbs_g * mealSplitRatios.snack,
                        protein: plan.protein_g * mealSplitRatios.snack,
                        fat: plan.fat_g * mealSplitRatios.snack,
                    },
                };

                const combinedTargets = {};
                mealOrder.forEach(meal => {
                    combinedTargets[meal] = cachedTargets[meal] || baseTargets[meal];
                });

                if (!isMounted) return;
                setUpcomingTargets(combinedTargets);

                const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
                const remainingLabels = remaining.map(m => mealLabels[m]);

                if (remainingLabels.length > 0) {
                    setAvailableMeals(remainingLabels);
                    setSelectedMealType(remainingLabels[0]);
                } else {
                    setAvailableMeals(['Snack']);
                    setSelectedMealType('Snack');
                }
            } catch (e) {
                console.error("Failed to load targets", e);
            } finally {
                if (isMounted) setIsLoadingTargets(false);
            }
        };

        loadTargets();

        const emergencyTimeout = setTimeout(() => {
            if (isMounted) {
                setIsLoadingTargets(false);
                setSelectedMealType(prev => prev || 'Snack');
            }
        }, 15000);

        return () => {
            isMounted = false;
            clearTimeout(emergencyTimeout);
        };
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col min-h-[calc(100vh-140px)] py-10 max-w-4xl mx-auto"
        >
            <motion.div variants={itemVariants} className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-black mb-4">Log Your Meal</h1>
                <p className="text-white/60 text-lg">Select a meal you'd like to log for today</p>
            </motion.div>

            {isLoadingTargets ? (
                <div className="flex justify-center items-center py-12 text-white/50">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
                >
                    {availableMeals.map(type => {
                        const targets = upcomingTargets[type.toLowerCase()] || { calories: 0, carbs: 0, protein: 0, fat: 0 };
                        return (
                            <motion.button
                                key={type}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/log/method', { state: { mealType: type } })}
                                className="bg-linear-to-br from-white/10 to-white/5 border border-white/10 hover:border-primary/50 transition-colors rounded-[2.5rem] p-8 text-left group"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-3xl font-black group-hover:text-primary transition-colors">{type}</h3>
                                    <ChevronRight className="w-6 h-6 text-white/30 group-hover:text-primary transition-colors" />
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-black/30 rounded-2xl p-3 text-center border border-white/5">
                                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Cals</div>
                                        <div className="font-black text-lg">{Math.round(targets.calories)}</div>
                                    </div>
                                    <div className="bg-black/30 rounded-2xl p-3 text-center border border-white/5">
                                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Carbs</div>
                                        <div className="font-black text-lg">{Math.round(targets.carbs)}g</div>
                                    </div>
                                    <div className="bg-black/30 rounded-2xl p-3 text-center border border-white/5">
                                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Pro</div>
                                        <div className="font-black text-lg">{Math.round(targets.protein)}g</div>
                                    </div>
                                    <div className="bg-black/30 rounded-2xl p-3 text-center border border-white/5">
                                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Fat</div>
                                        <div className="font-black text-lg">{Math.round(targets.fat)}g</div>
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </motion.div>
            )}
        </motion.div>
    );
};

export default LogFoodPage;

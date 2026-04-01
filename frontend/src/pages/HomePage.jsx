import React, { useEffect, useState } from 'react';
import { Camera, ChevronDown, Loader2, Save, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WelcomeCard from '../components/dashboard/WelcomeCard';
import ActivityOverview from '../components/dashboard/ActivityOverview';
import MacroSummary from '../components/dashboard/MacroSummary';
import NutritionJustification from '../components/dashboard/NutritionJustification';
import QuickActions from '../components/dashboard/QuickActions';
import RecentMeals from '../components/dashboard/RecentMeals';
import { dashboardData } from '../data/mockDashboardData';
import { getDailyStats } from '../services/mealService';
import { getGoogleFitActivity } from '../services/googleFitService';
import { generateAdjustedMealPlan } from '../services/mealPlanService';
import { calculateDiabetesNutritionPlan, getUserProfile, updateUserProfile } from '../services/userService';
import { useOnboarding } from '../contexts/OnboardingContext';
import { auth } from '../config/firebase';

const sortActivityRows = (rows = []) =>
  [...rows].sort((a, b) => String(b.activity_date || '').localeCompare(String(a.activity_date || '')));

const getTodayActivity = (rows = []) => {
  const today = new Date().toLocaleDateString('en-CA');
  return rows.find((row) => row.activity_date === today) || rows[0] || null;
};

const hasDiabetesInputs = (profile = {}) =>
  Boolean(
    profile.diabetes_type &&
    profile.hba1c &&
    profile.fasting_glucose &&
    profile.post_meal_glucose &&
    profile.diet_preference
  );

const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];

const mealLabels = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const mealSplitRatios = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.30,
  snack: 0.10,
};

const normalizeMealType = (value = '') => {
  const normalized = String(value).trim().toLowerCase();
  if (normalized.startsWith('break')) return 'breakfast';
  if (normalized.startsWith('lunch')) return 'lunch';
  if (normalized.startsWith('dinner')) return 'dinner';
  if (normalized.startsWith('snack')) return 'snack';
  return normalized;
};

const MealWindowSplit = ({ mealType, target, consumed }) => {
  const logged = (consumed?.calories || 0) > 0;
  const activeValues = {
    calories: Math.round((logged ? consumed?.calories : target?.calories) || 0),
    carbs: Math.round((logged ? consumed?.carbs : target?.carbs) || 0),
    protein: Math.round((logged ? consumed?.protein : target?.protein) || 0),
    fat: Math.round((logged ? consumed?.fat : target?.fat) || 0),
  };
  const toneClass = logged
    ? 'border-emerald-300/15 bg-linear-to-br from-emerald-400/12 via-emerald-300/6 to-transparent'
    : 'border-amber-300/15 bg-linear-to-br from-amber-300/12 via-amber-200/6 to-transparent';
  const badgeClass = logged
    ? 'bg-emerald-400/15 text-emerald-200'
    : 'bg-amber-300/15 text-amber-100';

  return (
    <div className="min-w-[320px] rounded-[2rem] border border-white/10 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-white/35">{mealLabels[mealType]}</div>
          <div className="mt-2 text-2xl font-black text-white">{activeValues.calories} kcal</div>
        </div>
        <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${badgeClass}`}>
          {logged ? 'Logged' : 'Pending'}
        </div>
      </div>

      <div className={`mt-5 rounded-[1.6rem] border px-4 py-4 ${toneClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {logged ? 'Consumed' : 'Target'}
          </div>
          <div className="text-xs font-medium text-white/40">
            {logged ? 'actual intake' : 'planned budget'}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Carbs</div>
            <div className="mt-2 text-xl font-black text-white">{activeValues.carbs}<span className="ml-1 text-xs font-medium text-white/45">g</span></div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Protein</div>
            <div className="mt-2 text-xl font-black text-white">{activeValues.protein}<span className="ml-1 text-xs font-medium text-white/45">g</span></div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Fat</div>
            <div className="mt-2 text-xl font-black text-white">{activeValues.fat}<span className="ml-1 text-xs font-medium text-white/45">g</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatQuantity = (detail) => {
  const quantity = Number(detail?.quantity || 1);
  const portionSizeG = Number(detail?.portion_size_g || 0);
  const basePortionSizeG = Number(detail?.base_portion_size_g || 0);
  const servingSizeLabel = String(detail?.serving_size_label || '').trim();
  const quantityLabel = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1);
  const unitLabel = quantity === 1 ? 'serving' : 'servings';
  if (portionSizeG > 0) {
    if (basePortionSizeG > 0) {
      return `${quantityLabel} ${unitLabel} | serving size ${Math.round(basePortionSizeG)} g | total ${Math.round(portionSizeG)} g`;
    }
    return `${quantityLabel} ${unitLabel} | total ${Math.round(portionSizeG)} g`;
  }
  if (servingSizeLabel) {
    return `${quantityLabel} ${unitLabel} | serving size ${servingSizeLabel}`;
  }
  return `${quantityLabel} ${unitLabel}`;
};

const UpcomingMealSection = ({ mealType, target, recommendation, loading, error, onLogMeal }) => {
  if (loading) {
    return (
      <div className="col-span-12 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-3 text-white/65">
        <Loader2 className="w-5 h-5 animate-spin" />
        Preparing your next meal target and recommendation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-12 bg-rose-400/10 border border-rose-400/15 rounded-[2.5rem] p-8">
        <div className="text-xs font-bold uppercase tracking-widest text-rose-100/70">Upcoming Meal Unavailable</div>
        <p className="mt-3 text-sm text-rose-50">{error}</p>
      </div>
    );
  }

  if (!mealType || !target || !recommendation) {
    return (
      <div className="col-span-12 bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
        <div className="text-xs font-bold uppercase tracking-widest text-white/35">Upcoming Meal</div>
        <h3 className="mt-3 text-2xl font-black text-white">No upcoming meal right now</h3>
        <p className="mt-3 text-sm text-white/50">Once there are remaining meal windows for today, the next recommendation will appear here.</p>
      </div>
    );
  }

  return (
    <div className="col-span-12 bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
      <div className="px-8 py-6 border-b border-white/8 bg-linear-to-r from-white/[0.04] to-transparent flex flex-col md:flex-row md:items-start md:justify-between gap-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-white/35">Upcoming Meal</div>
          <h3 className="mt-3 text-3xl font-black text-white">{mealLabels[mealType]}</h3>
          <p className="mt-2 text-sm text-white/50 max-w-2xl">
            This is the next meal window based on what you have already logged today.
          </p>
        </div>
        <button
          onClick={onLogMeal}
          className="px-5 py-3 rounded-2xl bg-white text-black font-bold flex items-center gap-2 hover:bg-primary-light transition-colors"
        >
          <Camera className="w-4 h-4" />
          <span>Log {mealLabels[mealType]} by Photo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6 p-8">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-2xl bg-white/8 border border-white/10">
              <Target className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/35">Target</div>
              <div className="text-xl font-black text-white">{Math.round(target?.calories || 0)} kcal</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Calories</div>
              <div className="mt-2 text-2xl font-black">{Math.round(target?.calories || 0)}<span className="ml-1 text-xs text-white/45 font-medium">kcal</span></div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Carbs</div>
              <div className="mt-2 text-2xl font-black">{Math.round(target?.carbs || 0)}<span className="ml-1 text-xs text-white/45 font-medium">g</span></div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Protein</div>
              <div className="mt-2 text-2xl font-black">{Math.round(target?.protein || 0)}<span className="ml-1 text-xs text-white/45 font-medium">g</span></div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Fat</div>
              <div className="mt-2 text-2xl font-black">{Math.round(target?.fat || 0)}<span className="ml-1 text-xs text-white/45 font-medium">g</span></div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald-400/10 bg-linear-to-br from-emerald-400/10 via-white/[0.03] to-transparent p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-200/60">Recommendation</div>
              <div className="mt-2 text-2xl font-black text-white">{Math.round((recommendation?.score || 0) * 100)}% fit</div>
            </div>
          </div>

          <div className="space-y-3">
            {(recommendation?.ingredientDetails || []).map((detail, index) => (
              <div key={`${detail.ingredient}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-white/90">{String(detail.ingredient || '').replace(/_/g, ' ')}</div>
                  {detail.matched_food ? (
                    <div className="text-xs text-white/40 mt-1">Matched to {String(detail.matched_food).replace(/_/g, ' ')}</div>
                  ) : null}
                </div>
                <div className="text-xs text-right text-amber-100/85 font-bold leading-relaxed">
                  {formatQuantity(detail)}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Calories</div>
              <div className="mt-2 text-xl font-black">{Math.round(recommendation?.macros?.calories || 0)}<span className="ml-1 text-xs text-white/45 font-medium">kcal</span></div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Carbs</div>
              <div className="mt-2 text-xl font-black">{Math.round(recommendation?.macros?.carbs || 0)}<span className="ml-1 text-xs text-white/45 font-medium">g</span></div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Protein</div>
              <div className="mt-2 text-xl font-black">{Math.round(recommendation?.macros?.protein || 0)}<span className="ml-1 text-xs text-white/45 font-medium">g</span></div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Fat</div>
              <div className="mt-2 text-xl font-black">{Math.round(recommendation?.macros?.fat || 0)}<span className="ml-1 text-xs text-white/45 font-medium">g</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecoverySnackAlert = ({ steps, carbsConsumed, carbsTarget }) => {
  const stepsNum = Number(steps) || 0;
  const needsRecoverySnack = stepsNum > 10000 && carbsConsumed < carbsTarget;

  if (!needsRecoverySnack) return (
    <div className="col-span-12 lg:col-span-6 bg-linear-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-[2.5rem] p-8 relative overflow-hidden h-full flex flex-col justify-center">
      <div className="relative z-10 flex flex-col items-start gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-emerald-100">Blood Sugar Stable</h3>
        </div>
        <p className="text-emerald-100/70 text-sm">
          No immediate risk of exercise-induced low blood sugar detected. Keep up the balance between your activity and carbohydrate intake!
        </p>
      </div>
      <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full" />
    </div>
  );

  return (
    <div className="col-span-12 lg:col-span-6 bg-linear-to-r from-amber-500/20 to-orange-600/10 border border-amber-500/30 rounded-[2.5rem] p-8 relative overflow-hidden h-full flex flex-col justify-center">
      <div className="relative z-10 flex flex-col items-start gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-amber-100">Low Blood Sugar Risk</h3>
        </div>
        <p className="text-amber-100/70 text-sm">
          You've taken {stepsNum.toLocaleString()} steps today but haven't reached your daily carbohydrate target yet ({Math.round(carbsConsumed)}g / {Math.round(carbsTarget)}g). Heavy exercise can cause delayed hypoglycemia.
        </p>
        <div className="w-full mt-2 p-4 bg-black/20 rounded-[1.5rem] border border-amber-500/20">
          <div className="text-[10px] uppercase tracking-widest font-bold text-amber-400/80 mb-1">Recommended Action</div>
          <div className="font-bold text-white text-sm">Eat a fast-acting recovery snack (15–20g carbs + protein)</div>
          <div className="text-xs text-white/50 mt-1">Example: 1 medium banana with 1 tbsp peanut butter</div>
        </div>
      </div>
      <div className="absolute -right-8 -top-8 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full" />
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { formData } = useOnboarding();
  const [dailyStats, setDailyStats] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [userProfile, setUserProfile] = useState(null);
  const [nutritionPlan, setNutritionPlan] = useState({
    target_calories: 2200,
    protein_g: 150,
    carbs_g: 250,
    fat_g: 70,
  });
  const [recentMeals, setRecentMeals] = useState([]);
  const [allMeals, setAllMeals] = useState([]);
  const [mealBuckets, setMealBuckets] = useState({});
  const [latestActivity, setLatestActivity] = useState(null);
  const [upcomingMealLoading, setUpcomingMealLoading] = useState(true);
  const [upcomingMealError, setUpcomingMealError] = useState('');
  const [upcomingMealTargets, setUpcomingMealTargets] = useState({});
  const [upcomingMealRecommendations, setUpcomingMealRecommendations] = useState({});
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [isSavingIntake, setIsSavingIntake] = useState(false);
  const [intakeMessage, setIntakeMessage] = useState('');
  const [intakeError, setIntakeError] = useState('');
  const [intakeForm, setIntakeForm] = useState({
    diabetes_type: 'type2',
    hba1c: '',
    fasting_glucose: '',
    post_meal_glucose: '',
    hypoglycemia_history: 'no',
    medication_type: '',
    insulin_usage: 'no',
    diabetes_duration_years: '',
    diet_preference: '',
    food_allergies: '',
    meal_schedule: 'standard',
    alcohol_consumption: 'none',
    sleep_hours: '',
    stress_level: 5,
    medical_condition: '',
  });

  const fetchData = async () => {
    try {
      const [stats, profile, activity] = await Promise.all([
        getDailyStats(),
        getUserProfile(),
        getGoogleFitActivity(7).catch(() => ({ items: [] }))
      ]);

      setDailyStats(stats.totals);
      setAllMeals(stats.meals || []);
      setRecentMeals(stats.meals.slice(0, 3));
      const latest = getTodayActivity(sortActivityRows(activity.items || []));
      setLatestActivity(latest);

      const resolvedProfile = profile || formData;
      const plan = calculateDiabetesNutritionPlan(resolvedProfile, Number(latest?.calories_burned || 0));

      const today = new Date().toLocaleDateString('en-CA');
      const todaysMeals = (stats.meals || []).filter((meal) => meal.localDate === today || meal.date === today);
      const buckets = mealOrder.reduce((acc, mealType) => {
        acc[mealType] = { calories: 0, carbs: 0, protein: 0, fat: 0 };
        return acc;
      }, {});
      todaysMeals.forEach((meal) => {
        const key = normalizeMealType(meal.type || meal.items?.[0]?.mealType || '');
        if (!buckets[key]) return;
        buckets[key].calories += Number(meal.totalCalories || 0);
        buckets[key].carbs += Number(meal.macros?.carbs || 0);
        buckets[key].protein += Number(meal.macros?.protein || 0);
        buckets[key].fat += Number(meal.macros?.fat || 0);
      });

      setMealBuckets(buckets);
      if (profile) setUserProfile(profile);
      setIntakeForm((prev) => ({
        ...prev,
        ...resolvedProfile,
        stress_level: resolvedProfile?.stress_level || prev.stress_level,
      }));
      setShowIntakeForm(!hasDiabetesInputs(resolvedProfile));
      setNutritionPlan(plan);

      setUpcomingMealLoading(true);
      setUpcomingMealError('');
      try {
        const adjusted = await generateAdjustedMealPlan(
          {
            dailyMacros: {
              calories: plan.target_calories,
              carbs: plan.carbs_g,
              protein: plan.protein_g,
              fat: plan.fat_g,
            },
            consumedMacros: stats.totals,
            completedMeals: mealOrder.filter((mealType) => buckets[mealType]?.calories > 0),
          },
          { topN: 1 }
        );
        const targets = adjusted.next_meal_targets || {};
        setUpcomingMealTargets(targets);
        setUpcomingMealRecommendations(adjusted.recommended_meals || {});
        localStorage.setItem('nutrifit_cached_meal_targets', JSON.stringify(targets));
      } catch (error) {
        setUpcomingMealError(error.message || 'Could not load upcoming meal recommendation.');
      } finally {
        setUpcomingMealLoading(false);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard stats", e);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchData();
    }, 0);
    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleIntakeChange = (event) => {
    const { name, value } = event.target;
    setIntakeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleIntakeSave = async () => {
    setIsSavingIntake(true);
    setIntakeError('');
    setIntakeMessage('');
    try {
      const payload = {
        ...intakeForm,
        updated_at: new Date().toISOString(),
      };
      await updateUserProfile(payload);
      setUserProfile((prev) => ({ ...(prev || {}), ...payload }));
      setIntakeMessage('Diabetes profile updated.');
      setShowIntakeForm(false);
      await fetchData();
    } catch (error) {
      setIntakeError(error.message || 'Failed to save diabetes profile.');
    } finally {
      setIsSavingIntake(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currentName = userProfile?.firstName || formData?.firstName || auth.currentUser?.displayName?.split(' ')[0] || 'Friend';
  const currentStreak = userProfile?.streak || 1;

  const nutritionCards = {
    calories: { ...dashboardData.macros.calories, current: dailyStats.calories, target: nutritionPlan.target_calories },
    protein: { ...dashboardData.macros.protein, current: dailyStats.protein, target: nutritionPlan.protein_g },
    carbs: { ...dashboardData.macros.carbs, current: dailyStats.carbs, target: nutritionPlan.carbs_g },
    fat: { ...dashboardData.macros.fat, current: dailyStats.fat, target: nutritionPlan.fat_g }
  };

  const activityCards = latestActivity ? {
    steps: Number(latestActivity.steps || 0).toLocaleString(),
    caloriesBurned: Math.round(Number(latestActivity.calories_burned || 0)).toLocaleString(),
    distance: (Number(latestActivity.distance_meters || 0) / 1000).toFixed(2),
    heartRate: latestActivity.avg_heart_rate ? Math.round(Number(latestActivity.avg_heart_rate)).toString() : '--',
    activity_date: latestActivity.activity_date,
  } : null;

  const mealTargets = {
    breakfast: {
      calories: nutritionPlan.target_calories * mealSplitRatios.breakfast,
      carbs: nutritionPlan.carbs_g * mealSplitRatios.breakfast,
      protein: nutritionPlan.protein_g * mealSplitRatios.breakfast,
      fat: nutritionPlan.fat_g * mealSplitRatios.breakfast,
    },
    lunch: {
      calories: nutritionPlan.target_calories * mealSplitRatios.lunch,
      carbs: nutritionPlan.carbs_g * mealSplitRatios.lunch,
      protein: nutritionPlan.protein_g * mealSplitRatios.lunch,
      fat: nutritionPlan.fat_g * mealSplitRatios.lunch,
    },
    dinner: {
      calories: nutritionPlan.target_calories * mealSplitRatios.dinner,
      carbs: nutritionPlan.carbs_g * mealSplitRatios.dinner,
      protein: nutritionPlan.protein_g * mealSplitRatios.dinner,
      fat: nutritionPlan.fat_g * mealSplitRatios.dinner,
    },
    snack: {
      calories: nutritionPlan.target_calories * mealSplitRatios.snack,
      carbs: nutritionPlan.carbs_g * mealSplitRatios.snack,
      protein: nutritionPlan.protein_g * mealSplitRatios.snack,
      fat: nutritionPlan.fat_g * mealSplitRatios.snack,
    },
  };

  const nextMealType = mealOrder.find((mealType) => upcomingMealTargets?.[mealType]) || null;
  const nextRecommendation = nextMealType ? upcomingMealRecommendations?.[nextMealType] : null;

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="grid grid-cols-12 gap-6">
        <WelcomeCard user={{ greeting: getGreeting(), name: currentName, streak: currentStreak }} />

        <MacroSummary macros={nutritionCards} />
        <QuickActions />

        <div className="col-span-12 bg-white/5 border border-white/10 rounded-[2.5rem] p-6">
          <div className="mb-5">
            <h3 className="text-xl font-bold">Meal Macro Split</h3>
            <p className="text-sm text-white/45 mt-1">
              Target versus actual macros for each meal window today.
            </p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {mealOrder.map((mealType) => (
              <MealWindowSplit
                key={mealType}
                mealType={mealType}
                target={upcomingMealTargets?.[mealType] || mealTargets[mealType]}
                consumed={mealBuckets[mealType]}
              />
            ))}
          </div>
        </div>

        <UpcomingMealSection
          mealType={nextMealType}
          target={nextMealType ? upcomingMealTargets?.[nextMealType] : null}
          recommendation={nextRecommendation}
          loading={upcomingMealLoading}
          error={upcomingMealError}
          onLogMeal={() => navigate('/log/photo', { state: { mealType: mealLabels[nextMealType] } })}
        />

        {!hasDiabetesInputs(userProfile || formData) && (
          <div className="col-span-12 bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Diabetes Intake</h3>
                <p className="text-sm text-white/45 mt-1">
                  Save your medical and lifestyle details here so your dashboard targets stay personalized.
                </p>
              </div>
              <button
                onClick={() => setShowIntakeForm((prev) => !prev)}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 transition-colors font-bold flex items-center gap-2"
              >
                <span>{showIntakeForm ? 'Hide Form' : hasDiabetesInputs(userProfile || formData) ? 'Edit Intake' : 'Complete Intake'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showIntakeForm ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showIntakeForm ? (
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select name="diabetes_type" value={intakeForm.diabetes_type || 'type2'} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium">
                    <option value="type1">Type 1 Diabetes</option>
                    <option value="type2">Type 2 Diabetes</option>
                  </select>
                  <input name="hba1c" type="number" step="0.1" placeholder="HbA1c %" value={intakeForm.hba1c || ''} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium" />
                  <input name="diabetes_duration_years" type="number" placeholder="Duration (years)" value={intakeForm.diabetes_duration_years || ''} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium" />
                  <input name="fasting_glucose" type="number" placeholder="Fasting glucose" value={intakeForm.fasting_glucose || ''} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium" />
                  <input name="post_meal_glucose" type="number" placeholder="Post-meal glucose" value={intakeForm.post_meal_glucose || ''} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium" />
                  <input name="medication_type" type="text" placeholder="Medication type" value={intakeForm.medication_type || ''} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium" />
                  <select name="insulin_usage" value={intakeForm.insulin_usage || 'no'} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium">
                    <option value="no">No insulin</option>
                    <option value="yes">Uses insulin</option>
                  </select>
                  <select name="hypoglycemia_history" value={intakeForm.hypoglycemia_history || 'no'} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium">
                    <option value="no">No hypoglycemia history</option>
                    <option value="yes">History of hypoglycemia</option>
                  </select>
                  <select name="diet_preference" value={intakeForm.diet_preference || ''} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium">
                    <option value="">Diet preference</option>
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Veg</option>
                    <option value="vegan">Vegan</option>
                    <option value="eggetarian">Eggetarian</option>
                  </select>
                  <select name="meal_schedule" value={intakeForm.meal_schedule || 'standard'} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium">
                    <option value="standard">3 meals + snack</option>
                    <option value="early">Early eating window</option>
                    <option value="late">Late eating window</option>
                    <option value="shift">Shift schedule</option>
                  </select>
                  <select name="alcohol_consumption" value={intakeForm.alcohol_consumption || 'none'} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium">
                    <option value="none">No alcohol</option>
                    <option value="occasional">Occasional alcohol</option>
                    <option value="regular">Regular alcohol</option>
                  </select>
                  <input name="sleep_hours" type="number" step="0.5" placeholder="Sleep hours" value={intakeForm.sleep_hours || ''} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium" />
                  <input name="stress_level" type="number" min="1" max="10" placeholder="Stress 1-10" value={intakeForm.stress_level || ''} onChange={handleIntakeChange} className="bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium" />
                </div>

                <textarea
                  name="food_allergies"
                  placeholder="Food allergies / avoidances"
                  value={intakeForm.food_allergies || ''}
                  onChange={handleIntakeChange}
                  className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium min-h-24"
                />
                <textarea
                  name="medical_condition"
                  placeholder="Medical notes, hypertension, lipid issues, clinician advice"
                  value={intakeForm.medical_condition || ''}
                  onChange={handleIntakeChange}
                  className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 font-medium min-h-24"
                />

                {intakeError ? <div className="text-sm text-rose-300">{intakeError}</div> : null}
                {intakeMessage ? <div className="text-sm text-emerald-300">{intakeMessage}</div> : null}

                <div className="flex justify-end">
                  <button
                    onClick={handleIntakeSave}
                    disabled={isSavingIntake}
                    className="px-6 py-3 bg-white text-black rounded-2xl font-bold flex items-center gap-2 disabled:opacity-70"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingIntake ? 'Saving...' : 'Save Intake'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <ActivityOverview activity={activityCards} />

        <RecoverySnackAlert
          steps={latestActivity?.steps || 0}
          carbsConsumed={dailyStats.carbs || 0}
          carbsTarget={nutritionPlan.carbs_g || 0}
        />

        <RecentMeals meals={recentMeals} />

        <NutritionJustification plan={nutritionPlan} />
      </div>
    </div>
  );
};

export default HomePage;

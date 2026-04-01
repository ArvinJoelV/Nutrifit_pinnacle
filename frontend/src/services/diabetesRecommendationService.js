const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const mealTypeKey = (meal) => {
    const value = String(meal?.type || meal?.items?.[0]?.mealType || '').toLowerCase();
    if (value.includes('break')) return 'breakfast';
    if (value.includes('lunch')) return 'lunch';
    if (value.includes('dinner')) return 'dinner';
    return 'snacks';
};

const buildSnackSuggestion = (profile, activity, carbsRemaining) => {
    const insulinRisk = String(profile?.insulin_usage || 'no') === 'yes' || String(profile?.hypoglycemia_history || 'no') === 'yes';
    const steps = toNumber(activity?.steps);
    const burned = toNumber(activity?.calories_burned);

    if (!insulinRisk && steps < 10000 && burned < 350) return null;
    if (carbsRemaining <= 0) return null;

    const snackCarbs = Math.max(15, Math.min(20, Math.round(carbsRemaining)));
    return {
        level: insulinRisk ? 'warning' : 'tip',
        title: 'Hypo-Protection Snack',
        message: `Your activity load is elevated${steps >= 10000 ? ` (${steps.toLocaleString()} steps)` : ''}. A ${snackCarbs} g carb snack with protein can reduce late-day glucose dips.`,
        action: `Try yogurt + fruit, milk + crackers, or roasted chana with fruit.`,
    };
};

export const buildDiabetesRecommendations = ({
    profile = {},
    meals = [],
    activity = null,
    nutritionPlan = {},
} = {}) => {
    const totals = meals.reduce((acc, meal) => ({
        calories: acc.calories + toNumber(meal.totalCalories),
        carbs: acc.carbs + toNumber(meal?.macros?.carbs),
        protein: acc.protein + toNumber(meal?.macros?.protein),
        fat: acc.fat + toNumber(meal?.macros?.fat),
    }), { calories: 0, carbs: 0, protein: 0, fat: 0 });

    const mealBuckets = meals.reduce((acc, meal) => {
        const key = mealTypeKey(meal);
        acc[key] = acc[key] || { carbs: 0, calories: 0, count: 0 };
        acc[key].carbs += toNumber(meal?.macros?.carbs);
        acc[key].calories += toNumber(meal.totalCalories);
        acc[key].count += 1;
        return acc;
    }, {});

    const targetCarbs = toNumber(nutritionPlan.carbs_g);
    const targetProtein = toNumber(nutritionPlan.protein_g);
    const carbsRemaining = Math.max(targetCarbs - totals.carbs, 0);
    const proteinRemaining = Math.max(targetProtein - totals.protein, 0);

    const recommendations = [];

    if (totals.carbs > targetCarbs) {
        recommendations.push({
            level: 'warning',
            title: 'Carbs Already Above Target',
            message: `You have logged ${Math.round(totals.carbs)} g carbs against a ${targetCarbs} g target.`,
            action: 'Choose your next meal around non-starchy vegetables, lean protein, and lower-glycemic carbs.',
        });
    } else if (carbsRemaining > 0 && carbsRemaining <= 35) {
        recommendations.push({
            level: 'tip',
            title: 'Carb Budget Is Tight',
            message: `${Math.round(carbsRemaining)} g carbs remain for the day.`,
            action: 'Keep the next meal portion-controlled and favor fiber-rich carbs.',
        });
    }

    if (proteinRemaining > 25) {
        recommendations.push({
            level: 'tip',
            title: 'Protein Still Low',
            message: `You still need about ${Math.round(proteinRemaining)} g protein to reach today’s target.`,
            action: 'Add dal, paneer, Greek yogurt, eggs, tofu, or chicken to the next meal.',
        });
    }

    const lunchTarget = toNumber(nutritionPlan?.meal_distribution?.lunch);
    if (mealBuckets.lunch?.carbs > lunchTarget + 15 && lunchTarget > 0) {
        recommendations.push({
            level: 'warning',
            title: 'Lunch Carb Load Was High',
            message: `Lunch logged ${Math.round(mealBuckets.lunch.carbs)} g carbs versus a planned ${lunchTarget} g.`,
            action: 'Reduce rice/roti portion size next lunch and increase vegetables or protein.',
        });
    }

    const hba1c = toNumber(profile.hba1c);
    if (hba1c >= 8) {
        recommendations.push({
            level: 'warning',
            title: 'Tighter Carb Control Recommended',
            message: `HbA1c is ${hba1c}, so the plan is using a lower carb ratio for better glucose stability.`,
            action: 'Prefer evenly spaced meals and lower-glycemic carbs such as legumes, oats, and millets.',
        });
    }

    const snackRecommendation = buildSnackSuggestion(profile, activity, carbsRemaining);
    if (snackRecommendation) recommendations.push(snackRecommendation);

    if (recommendations.length === 0) {
        recommendations.push({
            level: 'positive',
            title: 'Plan Looks Balanced',
            message: 'Your logged meals are tracking reasonably close to today’s diabetes targets.',
            action: 'Keep meal timing steady and monitor how your next meal affects carbs and protein.',
        });
    }

    return {
        totals,
        recommendations: recommendations.slice(0, 4),
        primary: recommendations[0],
    };
};

export const toInsightCards = (guidance = {}) => {
    const toneToMeta = {
        warning: {
            type: 'warning',
            category: 'Diabetes',
            color: 'from-amber-400 to-orange-500',
        },
        tip: {
            type: 'tip',
            category: 'Nutrition',
            color: 'from-sky-400 to-cyan-500',
        },
        positive: {
            type: 'positive',
            category: 'Progress',
            color: 'from-emerald-400 to-teal-500',
        },
    };

    return (guidance.recommendations || []).map((item, index) => {
        const meta = toneToMeta[item.level] || toneToMeta.tip;
        return {
            id: `${item.level}-${index}-${item.title}`,
            ...meta,
            title: item.title,
            message: item.message,
            action: item.action,
        };
    });
};

const API_BASE_URL = import.meta.env.VITE_MEAL_PLAN_API_URL
    || import.meta.env.VITE_MEAL_ANALYSIS_API_URL
    || 'http://127.0.0.1:9510';

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const generateMealPlan = async (dailyMacros, { signal, topN = 3 } = {}) => {
    const payload = {
        daily_macros: {
            calories: toNumber(dailyMacros?.calories),
            carbs: toNumber(dailyMacros?.carbs),
            protein: toNumber(dailyMacros?.protein),
            fat: toNumber(dailyMacros?.fat),
        },
        top_n: topN,
    };

    const response = await fetch(`${API_BASE_URL}/api/generate-meal-plan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail || data.error || `Meal plan generation failed (${response.status})`);
    }

    return data;
};

export const generateAdjustedMealPlan = async (
    { dailyMacros, consumedMacros, completedMeals },
    { signal, topN = 1 } = {},
) => {
    const response = await fetch(`${API_BASE_URL}/api/adjust-meal-plan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            daily_macros: {
                calories: toNumber(dailyMacros?.calories),
                carbs: toNumber(dailyMacros?.carbs),
                protein: toNumber(dailyMacros?.protein),
                fat: toNumber(dailyMacros?.fat),
            },
            consumed_macros: {
                calories: toNumber(consumedMacros?.calories),
                carbs: toNumber(consumedMacros?.carbs),
                protein: toNumber(consumedMacros?.protein),
                fat: toNumber(consumedMacros?.fat),
            },
            completed_meals: Array.isArray(completedMeals) ? completedMeals : [],
            top_n: topN,
        }),
        signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail || data.error || `Adjusted meal plan failed (${response.status})`);
    }

    return data;
};

import { auth } from '../config/firebase';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:9510').replace(/\/$/, '');

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getUserId = () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user.uid;
};

const normalizeMacros = (macros = {}) => ({
    calories: toNumber(macros.calories),
    carbs: toNumber(macros.carbs),
    protein: toNumber(macros.protein),
    fat: toNumber(macros.fat),
});

export const runMealLoggedWorkflow = async ({
    dailyMacros,
    consumedMacros,
    completedMeals = [],
    latestMeal = {},
    patientProfile = {},
    activity = {},
    topN = 1,
} = {}, { signal } = {}) => {
    const response = await fetch(`${API_BASE_URL}/api/agent/workflows/log-meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: getUserId(),
            dailyMacros: normalizeMacros(dailyMacros),
            consumedMacros: normalizeMacros(consumedMacros),
            completedMeals,
            latestMeal,
            patientProfile,
            activity,
            topN,
        }),
        signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || payload.message || `Agent workflow failed (${response.status})`);
    }
    return payload;
};

import { db, auth } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Fetch full user profile from Firestore
 */
export const getUserProfile = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { uid: user.uid, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (data) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const docRef = doc(db, 'users', user.uid);
        await setDoc(docRef, data, { merge: true });
        return true;
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getActivityMultiplier = (activityLevel) => {
    const multipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        athlete: 1.9,
        very_active: 1.9,
    };
    return multipliers[activityLevel] || 1.2;
};

const getGoalAdjustment = (goal) => {
    const adjustments = {
        lose: -400,
        maintain: 0,
        gain: 300,
    };
    return adjustments[goal] || 0;
};

const getCarbRatio = (profile, activeCalories = 0) => {
    const hba1c = toNumber(profile.hba1c);
    const fastingGlucose = toNumber(profile.fasting_glucose);
    const postMealGlucose = toNumber(profile.post_meal_glucose);
    const isInsulinResistant = hba1c >= 8 || fastingGlucose >= 130 || postMealGlucose >= 180;

    if (isInsulinResistant) return 0.4;
    if (activeCalories >= 250) return 0.48;
    return 0.45;
};

const getWearableAdjustment = (activeCalories = 0) => {
    const calories = Math.max(0, toNumber(activeCalories, 0));
    if (calories <= 0) return 0;
    return Math.min(Math.round(calories * 0.35), 350);
};

export const calculateDiabetesNutritionPlan = (profile = {}, activeCalories = 0) => {
    const weight = toNumber(profile.weight, 70);
    const height = toNumber(profile.height, 170);
    const age = toNumber(profile.age, 30);
    const isMale = profile.gender === 'male';
    const hba1c = toNumber(profile.hba1c);
    const fastingGlucose = toNumber(profile.fasting_glucose);
    const postMealGlucose = toNumber(profile.post_meal_glucose);

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr = isMale ? bmr + 5 : bmr - 161;

    const baselineTdee = Math.round(bmr * getActivityMultiplier(profile.activity_level));
    const wearableAdjustment = getWearableAdjustment(activeCalories);
    const dynamicTdee = Math.round(baselineTdee + wearableAdjustment);
    const dailyCalories = Math.max(1200, Math.round(dynamicTdee + getGoalAdjustment(profile.goal)));

    const carbRatio = getCarbRatio(profile, activeCalories);
    const carbsG = Math.round((dailyCalories * carbRatio) / 4);

    const proteinPerKg = profile.goal === 'lose' ? 1.5 : 1.4;
    const proteinG = Math.round(weight * proteinPerKg);
    const proteinCalories = proteinG * 4;
    const carbCalories = carbsG * 4;
    const remainingCalories = Math.max(dailyCalories - carbCalories - proteinCalories, 0);
    const fatG = Math.round(remainingCalories / 9);

    const hasHypertension = String(profile.medical_condition || '').toLowerCase().includes('hypertension');
    const fiberG = Math.max(25, Math.min(35, Math.round(dailyCalories / 100)));
    const sodiumLimitMg = hasHypertension ? 1500 : 2300;
    const satFatLimitG = Math.round((dailyCalories * 0.1) / 9);
    const addedSugarLimitG = Math.round((dailyCalories * 0.05) / 4);

    const mealDistribution = {
        breakfast: Math.round(carbsG * 0.25),
        lunch: Math.round(carbsG * 0.35),
        dinner: Math.round(carbsG * 0.30),
        snacks: Math.round(carbsG * 0.10),
    };

    return {
        bmr: Math.round(bmr),
        baseline_tdee: baselineTdee,
        wearable_adjustment_calories: wearableAdjustment,
        dynamic_tdee: dynamicTdee,
        target_calories: dailyCalories,
        carb_ratio: carbRatio,
        carbs_g: carbsG,
        protein_g: proteinG,
        fat_g: fatG,
        fiber_g: fiberG,
        sodium_limit_mg: sodiumLimitMg,
        sat_fat_limit_g: satFatLimitG,
        added_sugar_limit_g: addedSugarLimitG,
        meal_distribution: mealDistribution,
        explanations: {
            calories: `BMR ${Math.round(bmr)} x activity factor ${getActivityMultiplier(profile.activity_level)} = ${baselineTdee} kcal baseline, plus ${wearableAdjustment} kcal wearable adjustment, then ${getGoalAdjustment(profile.goal)} kcal goal adjustment.`,
            carbs: `Carbs set at ${Math.round(carbRatio * 100)}% of calories because HbA1c is ${hba1c || 'not set'}, fasting glucose is ${fastingGlucose || 'not set'}, and post-meal glucose is ${postMealGlucose || 'not set'}.`,
            protein: `Protein set to ${proteinPerKg} g/kg to support glucose stability and muscle preservation at your current weight of ${weight} kg.`,
            fat: `Fat uses the remaining calories after carbs (${carbsG} g) and protein (${proteinG} g) are assigned.`,
            fiber: `Fiber target is ${fiberG} g/day to support slower glucose absorption and satiety.`,
            sodium: `Sodium limit is ${sodiumLimitMg} mg/day${hasHypertension ? ' because hypertension was noted.' : '.'}`,
        },
    };
};

export const calculateMacroTargets = (profile = {}, activeCalories = 0) => {
    const plan = calculateDiabetesNutritionPlan(profile, activeCalories);
    return {
        protein: plan.protein_g,
        carbs: plan.carbs_g,
        fat: plan.fat_g,
        calories: plan.target_calories,
        fiber: plan.fiber_g,
        sodium: plan.sodium_limit_mg,
        satFat: plan.sat_fat_limit_g,
        mealDistribution: plan.meal_distribution,
    };
};

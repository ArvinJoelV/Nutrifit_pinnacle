/**
 * Generates metabolic predictions based on meal macros.
 */
export const predictMealEffect = (meal, modifiers = {}) => {
    // Default values if no meal provided
    if (!meal) {
        return {
            energyCurve: generateCurve('balanced'),
            cravings: { level: 'Low', time: '4h' },
            sleepImpact: 85,
            digestionTime: 2.5,
            message: "Log a meal to see its specific impact!"
        };
    }

    const { macros, totalCalories } = meal;
    const proteinRatio = (macros.protein * 4) / totalCalories;
    const carbRatio = (macros.carbs * 4) / totalCalories;

    // Simple logic to determine curve type
    let curveType = 'balanced';
    let message = "Balanced fuel for steady energy.";
    let cravings = { level: 'Low', time: '4h' };
    let sleepImpact = 90;

    if (carbRatio > 0.6) {
        curveType = 'spike';
        message = "Quick energy burst, but watch out for the crash.";
        cravings = { level: 'High', time: '2h' };
        sleepImpact = 70; // Sugar might disrupt sleep
    } else if (proteinRatio > 0.4) {
        curveType = 'steady';
        message = "Sustained release energy. Great for focus.";
        cravings = { level: 'Low', time: '5h' };
        sleepImpact = 95;
    }

    // Apply modifiers
    if (modifiers.walk10min && curveType === 'spike') {
        curveType = 'dampened_spike';
        message = "Walking helped flatten the glucose spike!";
        cravings = { level: 'Medium', time: '3h' };
    }

    // Adjust for portion multiplier if present in parent meal calculation (mostly handled in MealSimulatorPage for macros/cals),
    // but here we can adjust digestion time based on total calories.
    const digestionTime = totalCalories > 800 ? 5 : totalCalories > 400 ? 3 : 2;

    return {
        energyCurve: generateCurve(curveType),
        cravings,
        sleepImpact,
        digestionTime,
        message
    };
};

const generateCurve = (type) => {
    // Returns array of 5 points (0h, 1h, 2h, 3h, 4h) normalized 0-100
    switch (type) {
        case 'spike': return [20, 95, 40, 30, 25]; // Fast up, fast down
        case 'dampened_spike': return [20, 70, 75, 60, 40]; // Comparison: smoother
        case 'steady': return [20, 50, 60, 55, 40]; // Slow up, steady
        case 'balanced': default: return [20, 70, 65, 50, 35]; // Normal arc
    }
};

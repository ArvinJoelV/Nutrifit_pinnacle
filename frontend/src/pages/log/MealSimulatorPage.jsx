import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Beaker } from 'lucide-react';
import EnergyGraph from '../../components/eat-effect/EnergyGraph';
import SimulationControls from '../../components/eat-effect/SimulationControls';
import { getMealLog } from '../../services/mealService';
import { predictMealEffect } from '../../data/mockPredictionService';

const MealSimulatorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [originalMeal, setOriginalMeal] = useState(null);
    const [modifiers, setModifiers] = useState({ portion: 1.0, addProtein: 0, walk10min: false });

    // Fetch original meal
    useEffect(() => {
        getMealLog(id).then(setOriginalMeal).catch(() => navigate('/home'));
    }, [id, navigate]);

    // Calculate Simulated Meal
    const simulatedMeal = useMemo(() => {
        if (!originalMeal) return null;

        const portion = modifiers.portion;
        const extraProtein = modifiers.addProtein;

        // Clone and adjust macros
        return {
            ...originalMeal,
            macros: {
                ...originalMeal.macros,
                protein: (originalMeal.macros.protein * portion) + extraProtein,
                carbs: originalMeal.macros.carbs * portion,
                fat: originalMeal.macros.fat * portion
            },
            totalCalories: (originalMeal.totalCalories * portion) + (extraProtein * 4)
        };
    }, [originalMeal, modifiers]);

    // Get Predictions
    const originalPrediction = useMemo(() => predictMealEffect(originalMeal), [originalMeal]);
    const simulatedPrediction = useMemo(() => predictMealEffect(simulatedMeal, modifiers), [simulatedMeal, modifiers]);

    if (!originalMeal) return <div className="p-10 text-center">Loading simulator...</div>;

    return (
        <div className="min-h-screen bg-[#060606] p-6 max-w-lg mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate(-1)} className="p-3 bg-white/5 rounded-full hover:bg-white/10">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-purple-400" />
                    <span className="font-bold">Meal Simulator</span>
                </div>
                <button
                    onClick={() => setModifiers({ portion: 1.0, addProtein: 0, walk10min: false })}
                    className="p-3 bg-white/5 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Comparison Graph */}
            <div className="mb-8 relative">
                <EnergyGraph
                    data={simulatedPrediction.energyCurve}
                    comparisonData={originalPrediction.energyCurve}
                />
                <motion.div
                    key={simulatedPrediction.message}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-linear-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl text-sm font-medium text-white/80"
                >
                    {simulatedPrediction.message}
                </motion.div>
            </div>

            {/* Controls */}
            <SimulationControls modifiers={modifiers} setModifiers={setModifiers} />

            {/* Live Stats Comparison */}
            <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 text-center opacity-50">
                    <div className="text-xs uppercase font-bold mb-1">Original Cals</div>
                    <div className="text-xl font-black">{Math.round(originalMeal.totalCalories)}</div>
                </div>
                <div className="bg-white/5 border border-primary/20 rounded-2xl p-4 text-center">
                    <div className="text-xs uppercase font-bold mb-1 text-primary">New Cals</div>
                    <div className="text-xl font-black text-white">{Math.round(simulatedMeal.totalCalories)}</div>
                </div>
            </div>
        </div>
    );
};

export default MealSimulatorPage;

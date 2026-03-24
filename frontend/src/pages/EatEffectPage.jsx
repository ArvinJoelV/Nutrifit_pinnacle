import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import EnergyGraph from '../components/eat-effect/EnergyGraph';
import CravingsMeter from '../components/eat-effect/CravingsMeter';
import { predictMealEffect } from '../data/mockPredictionService';
import { getDailyStats } from '../services/mealService';
import { Moon, Scale, ArrowRight, Info } from 'lucide-react';

const EatEffectPage = () => {
    const [prediction, setPrediction] = useState(null);

    useEffect(() => {
        const fetchLastMeal = async () => {
            // In a real app we might have a specific 'getLastMeal' function, 
            // but getDailyStats returns the meals array sorted by time already.
            try {
                const { meals } = await getDailyStats();
                const lastMeal = meals.length > 0 ? meals[0] : null;
                const result = predictMealEffect(lastMeal);
                setPrediction(result);
            } catch (e) {
                console.error(e);
            }
        };
        fetchLastMeal();
    }, []);

    if (!prediction) return <div className="p-10 text-center">Loading insights...</div>;

    return (
        <div className="max-w-2xl mx-auto pb-24">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <span className="bg-linear-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
                        Eat → Effect
                    </span>
                    <ActivityIcon className="text-teal-400" />
                </h1>
                <p className="text-white/60 font-medium">Real-time metabolic forecast based on your intake.</p>
            </div>

            {/* Main Insights Grid */}
            <div className="space-y-6">

                {/* 1. Energy Graph */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <EnergyGraph data={prediction.energyCurve} />
                    <div className="mt-3 flex gap-2 items-start text-xs text-white/50 px-2">
                        <Info className="w-4 h-4 shrink-0 text-teal-400" />
                        <p>{prediction.message}</p>
                    </div>
                </motion.div>

                {/* 2. Cravings Meter */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <CravingsMeter risk={prediction.cravings.level} time={prediction.cravings.time} />
                </motion.div>

                {/* 3. Secondary Metrics (Sleep & Weight) */}
                <div className="grid grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/5 border border-white/5 rounded-3xl p-5 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <Moon className="w-6 h-6 text-indigo-400 mb-3" />
                            <div className="text-2xl font-black">{prediction.sleepImpact}%</div>
                            <div className="text-xs text-white/40 font-bold uppercase tracking-wide">Sleep Quality</div>
                        </div>
                        <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-colors" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/5 border border-white/5 rounded-3xl p-5 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <Scale className="w-6 h-6 text-emerald-400 mb-3" />
                            <div className="text-2xl font-black">Stable</div>
                            <div className="text-xs text-white/40 font-bold uppercase tracking-wide">Weight Trend</div>
                        </div>
                        <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-colors" />
                    </motion.div>
                </div>

                {/* 4. Timeline (Decorative) */}
                <div className="pt-8 relative">
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-white/10" />
                    {[
                        { time: 'Now', event: 'Meal Logged', color: 'bg-teal-500' },
                        { time: `+${prediction.digestionTime}h`, event: 'Digestion Complete', color: 'bg-blue-500' },
                        { time: '10:00 PM', event: 'Recovery Mode', color: 'bg-indigo-500' }
                    ].map((item, i) => (
                        <div key={i} className="flex gap-6 mb-8 relative items-center">
                            <div className={`w-3 h-3 rounded-full ${item.color} shadow-[0_0_10px_currentColor] z-10 ml-[10px]`} />
                            <div>
                                <div className="text-xs font-bold text-white/40">{item.time}</div>
                                <div className="text-sm font-bold">{item.event}</div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

const ActivityIcon = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        className={className}
    >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

export default EatEffectPage;

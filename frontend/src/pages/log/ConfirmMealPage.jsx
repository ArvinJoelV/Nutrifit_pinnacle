import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Save, Edit2, X } from 'lucide-react';
import { saveMealLog } from '../../data/mockMealStorage';

const ConfirmMealPage = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [mealTime, setMealTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    if (!state?.mealData) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p>No meal data found.</p>
                <button onClick={() => navigate('/home')} className="mt-4 text-primary">Go Home</button>
            </div>
        );
    }

    const { items, totalCalories } = state.mealData;

    // Calculate total macros
    const macros = items.reduce((acc, item) => ({
        protein: acc.protein + (item.protein || 0) * (item.multiplier || 1),
        carbs: acc.carbs + (item.carbs || 0) * (item.multiplier || 1),
        fat: acc.fat + (item.fat || 0) * (item.multiplier || 1),
    }), { protein: 0, carbs: 0, fat: 0 });

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const savedLog = await saveMealLog({
                items,
                totalCalories,
                macros,
                time: mealTime,
                type: items[0]?.mealType || 'Snack' // Default type if not set
            });
            navigate(`/meal/${savedLog.id}`);
        } catch (error) {
            console.error(error);
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#060606] flex flex-col p-6 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate(-1)} className="p-3 bg-white/5 rounded-full hover:bg-white/10">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">Confirm Meal</h1>
                <div className="w-12" />
            </div>

            {/* Total Calories Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-linear-to-br from-primary/20 to-primary-light/5 border border-primary/20 rounded-[2.5rem] p-8 text-center mb-6"
            >
                <span className="text-sm font-bold text-primary uppercase tracking-widest mb-2 block">Total Impact</span>
                <div className="text-6xl font-black mb-2">{Math.round(totalCalories)}</div>
                <div className="text-white/60 font-medium">kcal</div>

                {/* Macro Bars */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                    {[
                        { label: 'Protein', val: macros.protein, color: 'bg-emerald-500' },
                        { label: 'Carbs', val: macros.carbs, color: 'bg-amber-500' },
                        { label: 'Fat', val: macros.fat, color: 'bg-rose-500' },
                    ].map((macro) => (
                        <div key={macro.label} className="flex flex-col items-center">
                            <div className="h-24 w-1.5 bg-white/10 rounded-full mb-3 relative overflow-hidden">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: '60%' }} // Simulated height for visuals
                                    className={`absolute bottom-0 w-full rounded-full ${macro.color}`}
                                />
                            </div>
                            <span className="font-bold text-lg">{Math.round(macro.val)}g</span>
                            <span className="text-[10px] uppercase font-bold text-white/40">{macro.label}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Meal Time */}
            <div className="bg-white/5 rounded-2xl p-4 flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-white/60" />
                    <span className="font-bold">Time</span>
                </div>
                <input
                    type="time"
                    value={mealTime}
                    onChange={(e) => setMealTime(e.target.value)}
                    className="bg-transparent text-right font-bold outline-none cursor-pointer"
                />
            </div>

            {/* Food List */}
            <div className="flex-1 space-y-4 mb-20 overflow-y-auto custom-scrollbar">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest px-2">Foods</h3>
                {items.map((item, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                            <div className="font-bold mb-1">{item.name}</div>
                            <div className="text-xs text-white/40 font-medium">
                                {item.multiplier ? `${item.multiplier}x portion` : item.serving}
                            </div>
                        </div>
                        <div className="font-black text-lg">
                            {Math.round(item.calories * (item.multiplier || 1))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-xl border-t border-white/10 flex gap-4 max-w-lg mx-auto">
                <button
                    onClick={() => navigate('/home')}
                    className="p-4 rounded-2xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 bg-white text-black rounded-2xl font-bold py-4 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-70 disabled:scale-100"
                >
                    {isSaving ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                        />
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            <span>Save Meal</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ConfirmMealPage;

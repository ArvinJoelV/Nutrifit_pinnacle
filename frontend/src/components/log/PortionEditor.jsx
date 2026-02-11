import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Utensils } from 'lucide-react';

const PortionEditor = ({ items, onUpdateItem }) => {

    const handleSliderChange = (id, e) => {
        const multiplier = parseFloat(e.target.value);
        onUpdateItem(id, multiplier);
    };

    const adjustMultiplier = (id, current, amount) => {
        const newMultiplier = Math.max(0.25, Math.min(3, current + amount));
        onUpdateItem(id, newMultiplier);
    };

    return (
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {items.map((item, index) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <Utensils className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">{item.name}</h4>
                                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                                    {Math.round(item.calories * (item.multiplier || 1))} kcal
                                </p>
                            </div>
                        </div>
                        <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded-lg">
                            {(item.multiplier || 1).toFixed(1)}x
                        </span>
                    </div>

                    {/* Slider Control */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => adjustMultiplier(item.id, item.multiplier || 1, -0.25)}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                            <Minus className="w-4 h-4" />
                        </button>

                        <input
                            type="range"
                            min="0.25"
                            max="3"
                            step="0.25"
                            value={item.multiplier || 1}
                            onChange={(e) => handleSliderChange(item.id, e)}
                            className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />

                        <button
                            onClick={() => adjustMultiplier(item.id, item.multiplier || 1, 0.25)}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Macros */}
                    <div className="flex justify-between mt-4 pt-4 border-t border-white/5 text-xs font-medium text-white/50">
                        <span>P: {Math.round(item.protein * (item.multiplier || 1))}g</span>
                        <span>C: {Math.round(item.carbs * (item.multiplier || 1))}g</span>
                        <span>F: {Math.round(item.fat * (item.multiplier || 1))}g</span>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default PortionEditor;

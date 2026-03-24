import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus } from 'lucide-react';

const RecentMeals = ({ meals }) => {
    return (
        <div className="col-span-12 lg:col-span-6 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Recent Meals</h3>
                <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-4">
                {meals.map((meal, index) => (
                    <motion.div
                        key={meal.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-xl bg-white/10 overflow-hidden relative">
                            <img src={meal.image} alt={meal.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <div className="flex-1">
                            <h4 className="font-bold text-lg leading-tight">{meal.name}</h4>
                            <div className="flex items-center gap-2 text-white/40 text-sm mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{meal.time}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="block font-black text-xl">{meal.calories}</span>
                            <span className="text-xs font-bold text-white/40 uppercase">kcal</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default RecentMeals;

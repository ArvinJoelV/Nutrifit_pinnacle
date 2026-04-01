import React from 'react';
import { Clock, Plus } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:9510';

const getMealTitle = (meal) => {
    if (meal.name && meal.name !== 'Breakfast' && meal.name !== 'Lunch' && meal.name !== 'Dinner' && meal.name !== 'Snack') return meal.name;
    if (Array.isArray(meal.items) && meal.items.length > 0) {
        return meal.items.map((item) => item.name).slice(0, 2).join(', ');
    }
    if (meal.type) return meal.type;
    return 'Meal';
};

const getMealImage = (meal) => {
    let img = null;
    if (meal.image) img = meal.image;
    else if (Array.isArray(meal.items) && meal.items[0]?.image) img = meal.items[0].image;

    if (img && img.startsWith('static/')) {
        return `${API_BASE_URL.replace(/\/$/, '')}/${img}`;
    }
    return img;
};

const getMealCalories = (meal) => meal.calories ?? meal.totalCalories ?? 0;

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
                {meals.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/45">
                        No saved meals yet. Log a meal to see it here.
                    </div>
                ) : null}
                {meals.map((meal) => (
                    <div
                        key={meal.id}
                        className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-xl bg-white/10 overflow-hidden relative flex items-center justify-center">
                            {getMealImage(meal) ? (
                                <img src={getMealImage(meal)} alt={getMealTitle(meal)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <span className="text-xs font-bold text-white/35 uppercase">Meal</span>
                            )}
                        </div>

                        <div className="flex-1">
                            <h4 className="font-bold text-lg leading-tight">{getMealTitle(meal)}</h4>
                            <div className="flex items-center gap-2 text-white/40 text-sm mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{meal.time || '--:--'}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="block font-black text-xl">{Math.round(getMealCalories(meal))}</span>
                            <span className="text-xs font-bold text-white/40 uppercase">kcal</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentMeals;

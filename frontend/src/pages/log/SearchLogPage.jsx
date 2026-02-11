import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Plus, X, ChevronRight, Check } from 'lucide-react';
import { mockFoodDatabase, searchCategories } from '../../data/mockFoodDatabase';

const SearchLogPage = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedFood, setSelectedFood] = useState(null);

    // Modal State
    const [quantity, setQuantity] = useState(1);
    const [mealType, setMealType] = useState("Breakfast");

    // Filtering Logic
    const filteredFoods = useMemo(() => {
        return mockFoodDatabase.filter(food => {
            const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (food.brand && food.brand.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = selectedCategory === "All" || food.category === selectedCategory ||
                (selectedCategory === "Breakfast" && food.category === "Breakfast"); // Simple category matching
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory]);

    const handleFoodClick = (food) => {
        setSelectedFood(food);
        setQuantity(1);
        setMealType("Lunch"); // Default or logic to guess time of day
    };

    const handleConfirm = () => {
        if (!selectedFood) return;

        const totalCalories = Math.round(selectedFood.calories * quantity);
        const itemData = {
            ...selectedFood,
            multiplier: quantity,
            mealType
        };

        const mealData = {
            image: null, // No image for search items
            items: [itemData],
            totalCalories
        };

        navigate('/log/confirm', { state: { mealData } });
    };

    return (
        <div className="h-screen flex flex-col bg-[#060606]">
            {/* Header */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/log')}
                        className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-black">Search Food</h1>
                </div>

                {/* Search Bar */}
                <div className="relative group mb-6">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search for 'Oatmeal'..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border-2 border-transparent focus:border-primary/50 rounded-[2rem] py-4 pl-14 pr-6 font-bold text-lg outline-none transition-all"
                    />
                </div>

                {/* Categories */}
                <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                    {searchCategories.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`
                        px-5 py-2 whitespace-nowrap rounded-full font-bold text-sm transition-all
                        ${selectedCategory === category
                                    ? 'bg-white text-black'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'}
                    `}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Food List */}
            <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-3">
                {filteredFoods.map((food, index) => (
                    <motion.div
                        key={food.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleFoodClick(food)}
                        className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors group"
                    >
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{food.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                {food.brand && <span className="text-xs font-bold text-white/40 uppercase tracking-wider">{food.brand}</span>}
                                <span className="text-xs text-white/40">•</span>
                                <span className="text-xs text-secondary-light font-medium">{food.serving}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <span className="block font-black text-lg">{food.calories}</span>
                                <span className="text-[10px] text-white/40 uppercase font-bold">kcal</span>
                            </div>
                            <div className="p-2 bg-white/5 rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                <Plus className="w-5 h-5" />
                            </div>
                        </div>
                    </motion.div>
                ))}
                {filteredFoods.length === 0 && (
                    <div className="text-center py-20 opacity-40">
                        <p>No foods found matching "{searchTerm}"</p>
                    </div>
                )}
            </div>

            {/* Add Details Modal / Bottom Sheet */}
            <AnimatePresence>
                {selectedFood && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedFood(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-white/10 rounded-t-[2.5rem] p-8 z-50 max-w-2xl mx-auto"
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-3xl font-black mb-1">{selectedFood.name}</h2>
                                    <p className="text-white/60 font-medium">{selectedFood.calories} kcal per {selectedFood.serving}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedFood(null)}
                                    className="p-2 bg-white/5 rounded-full hover:bg-white/10"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6 mb-10">
                                {/* Quantity Input */}
                                <div>
                                    <label className="text-sm font-bold text-white/40 uppercase tracking-widest mb-3 block">Quantity</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="number"
                                            step="0.25"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Number(e.target.value))}
                                            className="w-1/3 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-2xl font-bold text-center outline-none focus:border-primary/50"
                                        />
                                        <div className="flex-1 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-white/60 font-medium">
                                            servings
                                        </div>
                                    </div>
                                </div>

                                {/* Meal Type Selection */}
                                <div>
                                    <label className="text-sm font-bold text-white/40 uppercase tracking-widest mb-3 block">Meal</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                        {["Breakfast", "Lunch", "Dinner", "Snack"].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setMealType(type)}
                                                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm border transition-all ${mealType === type
                                                        ? 'bg-primary/20 border-primary text-primary'
                                                        : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Totals */}
                                <div className="flex justify-between items-center pt-6 border-t border-white/10">
                                    <div>
                                        <span className="block text-sm text-white/40 font-bold uppercase">Total</span>
                                        <span className="text-3xl font-black">{Math.round(selectedFood.calories * quantity)} kcal</span>
                                    </div>
                                    <button
                                        onClick={handleConfirm}
                                        className="px-8 py-4 bg-white text-black rounded-2xl font-bold hover:scale-[1.02] transition-transform flex items-center gap-3"
                                    >
                                        <Check className="w-5 h-5" />
                                        <span>Add to Log</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SearchLogPage;

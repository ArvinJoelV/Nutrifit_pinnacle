import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Plus, X, Check } from 'lucide-react';
import { searchFoods } from '../../services/foodSearchService';

const PAGE_SIZE = 20;

const SearchLogPage = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [selectedFood, setSelectedFood] = useState(null);
    const [foods, setFoods] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const observerRef = useRef(null);

    // Modal state
    const [quantity, setQuantity] = useState(1);
    const [mealType, setMealType] = useState('Breakfast');

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedTerm(searchTerm.trim());
        }, 350);

        return () => clearTimeout(timeout);
    }, [searchTerm]);

    useEffect(() => {
        const controller = new AbortController();

        const loadFirstPage = async () => {
            if (debouncedTerm.length < 2) {
                setFoods([]);
                setPage(1);
                setHasMore(false);
                setError('');
                return;
            }

            setIsLoading(true);
            setError('');
            try {
                const { items, hasMore: moreAvailable } = await searchFoods({
                    query: debouncedTerm,
                    page: 1,
                    pageSize: PAGE_SIZE,
                    signal: controller.signal,
                });
                setFoods(items);
                setPage(1);
                setHasMore(moreAvailable);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Food search failed:', err);
                    setFoods([]);
                    setHasMore(false);
                    setError('Could not load foods right now. Try again.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadFirstPage();
        return () => controller.abort();
    }, [debouncedTerm]);

    const handleLoadMore = useCallback(async () => {
        if (!hasMore || isLoadingMore) return;

        const nextPage = page + 1;
        setIsLoadingMore(true);
        setError('');
        try {
            const { items, hasMore: moreAvailable } = await searchFoods({
                query: debouncedTerm,
                page: nextPage,
                pageSize: PAGE_SIZE,
            });
            setFoods((prev) => [...prev, ...items]);
            setPage(nextPage);
            setHasMore(moreAvailable);
        } catch (err) {
            console.error('Loading more foods failed:', err);
            setError('Could not load more foods. Try again.');
        } finally {
            setIsLoadingMore(false);
        }
    }, [debouncedTerm, hasMore, isLoadingMore, page]);

    const setLoadMoreTarget = useCallback((node) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        if (!node || isLoading || isLoadingMore || !hasMore) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    handleLoadMore();
                }
            },
            { rootMargin: '220px' }
        );

        observerRef.current.observe(node);
    }, [handleLoadMore, hasMore, isLoading, isLoadingMore]);

    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    const handleFoodClick = (food) => {
        setSelectedFood(food);
        setQuantity(1);
        setMealType('Lunch');
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
            image: null,
            items: [itemData],
            totalCalories
        };

        navigate('/log/confirm', { state: { mealData } });
    };

    return (
        <div className="h-screen flex flex-col bg-[#060606]">
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
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-3">
                {foods.map((food) => (
                    <div
                        key={food.id}
                        onClick={() => handleFoodClick(food)}
                        className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors group"
                    >
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{food.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                {food.brand && <span className="text-xs font-bold text-white/40 uppercase tracking-wider">{food.brand}</span>}
                                <span className="text-xs text-white/40">-</span>
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
                    </div>
                ))}

                {isLoading && (
                    <div className="text-center py-10 opacity-60">
                        <p>Searching foods...</p>
                    </div>
                )}

                {!isLoading && debouncedTerm.length < 2 && (
                    <div className="text-center py-20 opacity-40">
                        <p>Type at least 2 characters to search.</p>
                    </div>
                )}

                {error && (
                    <div className="text-center py-10 text-rose-300">
                        <p>{error}</p>
                    </div>
                )}

                {!isLoading && !error && debouncedTerm.length >= 2 && foods.length === 0 && (
                    <div className="text-center py-20 opacity-40">
                        <p>No foods found matching "{debouncedTerm}"</p>
                    </div>
                )}

                {!isLoading && foods.length > 0 && hasMore && (
                    <div ref={setLoadMoreTarget} className="h-10 flex items-center justify-center">
                        {isLoadingMore ? <span className="text-sm text-white/50">Loading more...</span> : null}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedFood && (
                    <>
                        <div
                            onClick={() => setSelectedFood(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <div
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
                                <div>
                                    <label className="text-sm font-bold text-white/40 uppercase tracking-widest mb-3 block">Quantity</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="number"
                                            step="0.25"
                                            min="0.25"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Number(e.target.value))}
                                            className="w-1/3 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-2xl font-bold text-center outline-none focus:border-primary/50"
                                        />
                                        <div className="flex-1 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-white/60 font-medium">
                                            servings
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-white/40 uppercase tracking-widest mb-3 block">Meal</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                        {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => (
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
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SearchLogPage;

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, RefreshCw } from 'lucide-react';
import PhotoUpload from '../../components/log/PhotoUpload';
import FoodDetectionPreview from '../../components/log/FoodDetectionPreview';
import PortionEditor from '../../components/log/PortionEditor';
import { analyzeMealImage } from '../../services/mealAnalysisService';
import { getDailyStats } from '../../services/mealService';
import { getUserProfile, calculateDiabetesNutritionPlan } from '../../services/userService';
import { getGoogleFitActivity } from '../../services/googleFitService';
import { generateAdjustedMealPlan } from '../../services/mealPlanService';
import { useOnboarding } from '../../contexts/OnboardingContext';

const PhotoLogPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState('upload'); // upload, analyzing, review
    const [image, setImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [segmentedImage, setSegmentedImage] = useState(null);
    const [analysisError, setAnalysisError] = useState('');
    const [detectedItems, setDetectedItems] = useState([]);

    const { formData } = useOnboarding();
    const [isLoadingTargets, setIsLoadingTargets] = useState(true);
    const [availableMeals, setAvailableMeals] = useState(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
    const [upcomingTargets, setUpcomingTargets] = useState({});
    const initialMealType = location.state?.mealType || 'Snack';
    const [selectedMealType, setSelectedMealType] = useState(initialMealType);

    useEffect(() => {
        let isMounted = true;
        const loadTargets = async () => {
            setIsLoadingTargets(true);
            try {
                const [stats, profile, activity] = await Promise.all([
                    getDailyStats(),
                    getUserProfile(),
                    getGoogleFitActivity(7).catch(() => ({ items: [] }))
                ]);
                if (!isMounted) return;

                const today = new Date().toLocaleDateString('en-CA');
                const todaysMeals = (stats.meals || []).filter(m => m.localDate === today || m.date === today);

                const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
                const buckets = mealOrder.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});
                todaysMeals.forEach((meal) => {
                    const key = String(meal.type || meal.items?.[0]?.mealType || '').trim().toLowerCase();
                    const normalized = key.startsWith('break') ? 'breakfast' : key.startsWith('lunch') ? 'lunch' : key.startsWith('din') ? 'dinner' : key.startsWith('snack') ? 'snack' : key;
                    if (buckets[normalized] !== undefined) buckets[normalized] += Number(meal.totalCalories || 0);
                });

                const completed = mealOrder.filter(m => buckets[m] > 0);
                const remaining = mealOrder.filter(m => buckets[m] === 0);

                const resolvedProfile = profile || formData || {};
                const latestActivity = activity.items?.sort((a, b) => String(b.activity_date).localeCompare(String(a.activity_date))).find(r => r.activity_date === today) || activity.items?.[0] || null;

                const plan = calculateDiabetesNutritionPlan(resolvedProfile, Number(latestActivity?.calories_burned || 0));

                const adjusted = await generateAdjustedMealPlan(
                    {
                        dailyMacros: { calories: plan.target_calories, carbs: plan.carbs_g, protein: plan.protein_g, fat: plan.fat_g },
                        consumedMacros: stats.totals,
                        completedMeals: completed
                    },
                    { topN: 1 }
                );

                if (!isMounted) return;
                setUpcomingTargets(adjusted.next_meal_targets || {});

                const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
                const remainingLabels = remaining.map(m => mealLabels[m]);

                if (remainingLabels.length > 0) {
                    setAvailableMeals(remainingLabels);
                    if (!remainingLabels.includes(initialMealType)) {
                        setSelectedMealType(remainingLabels[0]);
                    }
                } else {
                    setAvailableMeals(['Snack']);
                    setSelectedMealType('Snack');
                }
            } catch (e) {
                console.error("Failed to load targets", e);
            } finally {
                if (isMounted) setIsLoadingTargets(false);
            }
        };
        loadTargets();
        return () => { isMounted = false; };
    }, [formData, initialMealType]);

    const handleImageSelect = ({ file, previewUrl }) => {
        if (image && image.startsWith('blob:')) {
            URL.revokeObjectURL(image);
        }
        setImage(previewUrl);
        setImageFile(file);
        setSegmentedImage(null);
        setAnalysisError('');
        setDetectedItems([]);
        setStep('analyzing');
    };

    useEffect(() => {
        if (step !== 'analyzing' || !imageFile) return undefined;

        let isCancelled = false;
        const controller = new AbortController();

        const runAnalysis = async () => {
            try {
                const result = await analyzeMealImage(imageFile, { signal: controller.signal });
                if (isCancelled) return;
                setDetectedItems(result.items.map((item) => ({ ...item, mealType: selectedMealType })));
                setSegmentedImage(result.segmentedImage || null);
                setStep('review');
            } catch (error) {
                if (isCancelled || error.name === 'AbortError') return;
                setAnalysisError(error.message || 'Analysis failed. Please try another image.');
                setStep('review');
            }
        };

        runAnalysis();

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, [imageFile, step]);

    useEffect(() => () => {
        if (image && image.startsWith('blob:')) {
            URL.revokeObjectURL(image);
        }
    }, [image]);

    const handleUpdateItem = (id, multiplier) => {
        setDetectedItems(prev => prev.map(item =>
            item.id === id ? { ...item, multiplier } : item
        ));
    };

    const handleConfirm = () => {
        // Calculate totals
        const totalCalories = detectedItems.reduce((sum, item) => sum + (item.calories * (item.multiplier || 1)), 0);

        const finalMealData = {
            image,
            segmentedImage,
            items: detectedItems.map((item) => ({ ...item, mealType: item.mealType || selectedMealType })),
            totalCalories: Math.round(totalCalories)
        };

        navigate('/log/confirm', { state: { mealData: finalMealData } });
    };

    const handleRetake = () => {
        if (image && image.startsWith('blob:')) {
            URL.revokeObjectURL(image);
        }
        setImage(null);
        setImageFile(null);
        setSegmentedImage(null);
        setAnalysisError('');
        setDetectedItems([]);
        setStep('upload');
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col max-w-5xl mx-auto px-4 lg:px-0">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={() => step === 'upload' ? navigate('/log') : handleRetake()}
                    className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold">
                        {step === 'upload' ? 'Photo Log' : step === 'analyzing' ? 'Analyzing...' : 'Review & Adjust'}
                    </h1>
                </div>
                <div className="w-12" /> {/* Spacer */}
            </div>

            <AnimatePresence mode="wait">
                {step === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 flex flex-col justify-center"
                    >
                        <div className="mb-8 w-full max-w-md mx-auto">
                            <h3 className="text-lg font-bold mb-4 text-center">Logging For</h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 px-2 custom-scrollbar justify-center">
                                {availableMeals.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedMealType(type)}
                                        className={`px-5 py-3 rounded-2xl font-bold whitespace-nowrap transition-colors border ${selectedMealType === type
                                                ? 'bg-primary/20 border-primary text-primary'
                                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {!isLoadingTargets && upcomingTargets[selectedMealType.toLowerCase()] && (
                                <div className="mt-4 grid grid-cols-4 gap-2">
                                    <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
                                        <div className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-1">Cals</div>
                                        <div className="font-black text-sm">{Math.round(upcomingTargets[selectedMealType.toLowerCase()].calories)}</div>
                                    </div>
                                    <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
                                        <div className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-1">Carbs</div>
                                        <div className="font-black text-sm">{Math.round(upcomingTargets[selectedMealType.toLowerCase()].carbs)}g</div>
                                    </div>
                                    <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
                                        <div className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-1">Pro</div>
                                        <div className="font-black text-sm">{Math.round(upcomingTargets[selectedMealType.toLowerCase()].protein)}g</div>
                                    </div>
                                    <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
                                        <div className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-1">Fat</div>
                                        <div className="font-black text-sm">{Math.round(upcomingTargets[selectedMealType.toLowerCase()].fat)}g</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <PhotoUpload onImageSelect={handleImageSelect} />
                    </motion.div>
                )}

                {(step === 'analyzing' || step === 'review') && (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
                    >
                        {/* Left: Image Preview */}
                        <div className="flex justify-center">
                            <FoodDetectionPreview
                                image={image}
                                segmentedImage={segmentedImage}
                                isAnalyzing={step === 'analyzing'}
                                error={analysisError}
                            />
                        </div>

                        {/* Right: Controls */}
                        <div className="h-full max-h-[500px] flex flex-col">
                            {step === 'review' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex flex-col h-full bg-black/20 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/10"
                                >
                                    <h3 className="text-lg font-bold mb-4 px-2">Detected Items</h3>

                                    {detectedItems.length > 0 ? (
                                        <PortionEditor
                                            items={detectedItems}
                                            onUpdateItem={handleUpdateItem}
                                        />
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-center text-white/60 px-4">
                                            No food items were detected. Try retaking the photo with better lighting.
                                        </div>
                                    )}

                                    <div className="mt-6 pt-6 border-t border-white/10">
                                        <div className="flex justify-between items-center mb-6 px-2">
                                            <span className="text-white/60 font-medium">Total Calories</span>
                                            <span className="text-3xl font-black">
                                                {Math.round(detectedItems.reduce((sum, item) => sum + (item.calories * (item.multiplier || 1)), 0))}
                                            </span>
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={handleRetake}
                                                className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                <RefreshCw className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={handleConfirm}
                                                disabled={!detectedItems.length}
                                                className="flex-1 py-4 bg-white text-black rounded-2xl font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                            >
                                                <Check className="w-5 h-5" />
                                                <span>Confirm Meal</span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PhotoLogPage;

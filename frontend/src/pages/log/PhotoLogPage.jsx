import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, RefreshCw, Cpu, Camera, Search, Sparkles } from 'lucide-react';
import PhotoUpload from '../../components/log/PhotoUpload';
import FoodDetectionPreview from '../../components/log/FoodDetectionPreview';
import MealPhotoViewer from '../../components/log/MealPhotoViewer';
import EnhancedPortionEditor from '../../components/log/EnhancedPortionEditor';
import PipelineInspectorModal from '../../components/log/PipelineInspectorModal';
import PipelineAnalysisTracker, { PIPELINE_STAGES } from '../../components/log/PipelineAnalysisTracker';
import { analyzeMealImage } from '../../services/mealAnalysisService';
import { getDailyStats } from '../../services/mealService';
import { getUserProfile, calculateDiabetesNutritionPlan } from '../../services/userService';
import { getGoogleFitActivity } from '../../services/googleFitService';
import { useOnboarding } from '../../contexts/OnboardingContext';

const REDISTRIBUTION_WEIGHTS = {
    'breakfast,dinner,lunch,snack': { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 },
    'dinner,lunch,snack': { lunch: 0.45, dinner: 0.40, snack: 0.15 },
    'dinner,lunch': { lunch: 0.55, dinner: 0.45 },
    'dinner,snack': { dinner: 0.75, snack: 0.25 },
    'breakfast,dinner,snack': { breakfast: 0.35, dinner: 0.50, snack: 0.15 },
    'lunch,snack': { lunch: 0.75, snack: 0.25 },
    'breakfast,lunch,snack': { breakfast: 0.35, lunch: 0.50, snack: 0.15 },
    'breakfast,dinner': { breakfast: 0.40, dinner: 0.60 },
    'breakfast,lunch': { breakfast: 0.40, lunch: 0.60 },
    'breakfast': { breakfast: 1.0 },
    'lunch': { lunch: 1.0 },
    'dinner': { dinner: 1.0 },
    'snack': { snack: 1.0 },
};

const DEFAULT_TARGETS = {
    breakfast: { calories: 500, carbs: 55, protein: 30, fat: 15 },
    lunch: { calories: 700, carbs: 80, protein: 45, fat: 20 },
    dinner: { calories: 600, carbs: 65, protein: 40, fat: 18 },
    snack: { calories: 200, carbs: 25, protein: 10, fat: 5 },
};

const getInitialCachedTargets = () => {
    try {
        const cached = localStorage.getItem('nutrifit_cached_meal_targets');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                return { ...DEFAULT_TARGETS, ...parsed };
            }
        }
    } catch (e) {}
    return DEFAULT_TARGETS;
};

const getInitialMealType = (passedMealType, cachedTargets) => {
    if (passedMealType && typeof passedMealType === 'string') {
        return passedMealType.charAt(0).toUpperCase() + passedMealType.slice(1).toLowerCase();
    }
    try {
        const rawCached = localStorage.getItem('nutrifit_cached_meal_targets');
        if (rawCached) {
            const parsed = JSON.parse(rawCached);
            const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
            const firstRemaining = mealOrder.find((m) => parsed?.[m] && Number(parsed[m].calories || 0) > 0);
            if (firstRemaining) {
                return firstRemaining.charAt(0).toUpperCase() + firstRemaining.slice(1);
            }
        }
    } catch (e) {}

    const hour = new Date().getHours();
    if (hour < 11) return 'Breakfast';
    if (hour < 15) return 'Lunch';
    if (hour < 20) return 'Dinner';
    return 'Snack';
};

const PhotoLogPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState('upload'); // upload, analyzing, review
    const [image, setImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [segmentedImage, setSegmentedImage] = useState(null);
    const [analysisError, setAnalysisError] = useState('');
    const [detectedItems, setDetectedItems] = useState([]);
    const [analysisMeta, setAnalysisMeta] = useState(null);
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [currentStageIndex, setCurrentStageIndex] = useState(1);
    const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

    const { formData } = useOnboarding();
    const initialTargets = getInitialCachedTargets();
    const [upcomingTargets, setUpcomingTargets] = useState(initialTargets);
    const [isLoadingTargets, setIsLoadingTargets] = useState(false);
    const [availableMeals, setAvailableMeals] = useState(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
    const initialMealType = getInitialMealType(location.state?.mealType, initialTargets);
    const [selectedMealType, setSelectedMealType] = useState(initialMealType);

    useEffect(() => {
        let isMounted = true;
        const loadTargets = async () => {
            try {
                const [stats, profile, activity] = await Promise.all([
                    getDailyStats().catch(() => ({ totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, meals: [] })),
                    getUserProfile().catch(() => null),
                    getGoogleFitActivity(7).catch(() => ({ items: [] }))
                ]);
                if (!isMounted) return;

                const today = new Date().toLocaleDateString('en-CA');
                const todaysMeals = (stats?.meals || []).filter(m => m.localDate === today || m.date === today);

                const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
                const buckets = mealOrder.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});
                todaysMeals.forEach((meal) => {
                    const key = String(meal.type || meal.items?.[0]?.mealType || '').trim().toLowerCase();
                    const normalized = key.startsWith('break') ? 'breakfast' : key.startsWith('lunch') ? 'lunch' : key.startsWith('din') ? 'dinner' : key.startsWith('snack') ? 'snack' : key;
                    if (buckets[normalized] !== undefined) buckets[normalized] += Number(meal.totalCalories || 0);
                });

                const remaining = mealOrder.filter(m => buckets[m] === 0);

                const resolvedProfile = profile || formData || {};
                let latestActivity = null;
                if (activity && Array.isArray(activity.items)) {
                    latestActivity = activity.items.sort((a, b) => String(b.activity_date).localeCompare(String(a.activity_date))).find(r => r.activity_date === today) || activity.items[0];
                }

                const plan = calculateDiabetesNutritionPlan(resolvedProfile, Number(latestActivity?.calories_burned || 0));

                const remainingKey = [...remaining].sort().join(',');
                const weights = REDISTRIBUTION_WEIGHTS[remainingKey] || {
                    breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10
                };

                const consumed = stats?.totals || { calories: 0, carbs: 0, protein: 0, fat: 0 };
                const remainingMacros = {
                    calories: Math.max(0, plan.target_calories - (consumed.calories || 0)),
                    carbs: Math.max(0, plan.carbs_g - (consumed.carbs || 0)),
                    protein: Math.max(0, plan.protein_g - (consumed.protein || 0)),
                    fat: Math.max(0, plan.fat_g - (consumed.fat || 0)),
                };

                const baseRatios = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };
                const computedTargets = { ...DEFAULT_TARGETS };
                mealOrder.forEach(m => {
                    computedTargets[m] = {
                        calories: Math.round(plan.target_calories * baseRatios[m]),
                        carbs: Math.round(plan.carbs_g * baseRatios[m]),
                        protein: Math.round(plan.protein_g * baseRatios[m]),
                        fat: Math.round(plan.fat_g * baseRatios[m]),
                    };
                });

                if (remaining.length > 0) {
                    remaining.forEach(m => {
                        const w = weights[m] || (1 / remaining.length);
                        computedTargets[m] = {
                            calories: Math.round(remainingMacros.calories * w),
                            carbs: Math.round(remainingMacros.carbs * w),
                            protein: Math.round(remainingMacros.protein * w),
                            fat: Math.round(remainingMacros.fat * w),
                        };
                    });
                }

                if (!isMounted) return;
                setUpcomingTargets(prev => ({ ...prev, ...computedTargets }));
                localStorage.setItem('nutrifit_cached_meal_targets', JSON.stringify(computedTargets));
            } catch (e) {
                console.error("Failed to load targets in background", e);
            }
        };
        loadTargets();
        return () => { isMounted = false; };
    }, [formData]);

    const handleImageSelect = ({ file, previewUrl }) => {
        if (image && image.startsWith('blob:')) {
            URL.revokeObjectURL(image);
        }
        setImage(previewUrl);
        setImageFile(file);
        setSegmentedImage(null);
        setAnalysisError('');
        setDetectedItems([]);
        setCurrentStageIndex(1);
        setIsAnalysisComplete(false);
        setStep('analyzing');
    };

    useEffect(() => {
        if (step !== 'analyzing' || !imageFile) return undefined;

        let isCancelled = false;
        const controller = new AbortController();
        setCurrentStageIndex(1);
        setIsAnalysisComplete(false);

        const STAGE_DELAYS = [
            { stage: 1, delay: 0 },
            { stage: 2, delay: 500 },
            { stage: 3, delay: 1100 },
            { stage: 4, delay: 1900 },
            { stage: 5, delay: 2800 },
            { stage: 6, delay: 3800 },
            { stage: 7, delay: 4900 },
            { stage: 8, delay: 6000 },
            { stage: 9, delay: 7200 },
        ];

        const timerIds = STAGE_DELAYS.map(({ stage, delay }) => {
            if (delay === 0) return null;
            return setTimeout(() => {
                if (!isCancelled) {
                    setCurrentStageIndex(stage);
                }
            }, delay);
        }).filter(Boolean);

        const runAnalysis = async () => {
            try {
                const result = await analyzeMealImage(imageFile, { signal: controller.signal });
                if (isCancelled) return;

                // Advance to final completed state
                setCurrentStageIndex(9);
                setIsAnalysisComplete(true);

                // Allow 450ms visual completion so user sees 100% all checkmarks
                await new Promise((resolve) => setTimeout(resolve, 450));
                if (isCancelled) return;

                setDetectedItems(result.items.map((item) => ({ ...item, mealType: selectedMealType })));
                setSegmentedImage(result.segmentedImage || null);
                setAnalysisMeta({
                    total_mass_g: result.total_mass_g,
                    scale_calibration: result.scale_calibration,
                    scene_assessment: result.scene_assessment,
                    gemini_validation: result.gemini_validation,
                    pipeline_trace: result.pipeline_trace || [],
                    pipeline_duration_ms: result.pipeline_duration_ms || 0,
                    execution_target: result.execution_target,
                });
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
            timerIds.forEach(id => clearTimeout(id));
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

    const handleDeleteItem = (id) => {
        setDetectedItems(prev => prev.filter(item => item.id !== id));
    };

    const handleAutoAdjust = () => {
        const mealKey = (selectedMealType || 'lunch').toLowerCase();
        const targetCal = upcomingTargets[mealKey]?.calories || 600;
        const currentCal = detectedItems.reduce((sum, item) => sum + (item.calories * (item.multiplier || 1)), 0);
        if (currentCal <= 0) return;
        const ratio = targetCal / currentCal;
        setDetectedItems(prev => prev.map(item => ({
            ...item,
            multiplier: Math.max(0.25, Math.min(3, Math.round(((item.multiplier || 1) * ratio) * 20) / 20)),
        })));
    };

    const handleConfirm = () => {
        // Calculate totals
        const totalCalories = detectedItems.reduce((sum, item) => sum + (item.calories * (item.multiplier || 1)), 0);
        const totalMass = detectedItems.reduce((sum, item) => sum + ((item.mass_g || 0) * (item.multiplier || 1)), 0);

        const finalMealData = {
            image,
            segmentedImage,
            items: detectedItems.map((item) => ({ ...item, mealType: item.mealType || selectedMealType })),
            totalCalories: Math.round(totalCalories),
            total_mass_g: totalMass > 0 ? Math.round(totalMass * 10) / 10 : (analysisMeta?.total_mass_g || null),
            scale_calibration: analysisMeta?.scale_calibration || null,
            scene_assessment: analysisMeta?.scene_assessment || null,
            gemini_validation: analysisMeta?.gemini_validation || null,
            pipeline_trace: analysisMeta?.pipeline_trace || [],
            pipeline_duration_ms: analysisMeta?.pipeline_duration_ms || 0,
            execution_target: analysisMeta?.execution_target,
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
        setAnalysisMeta(null);
        setAnalysisError('');
        setDetectedItems([]);
        setStep('upload');
    };

    return (
        <div className={`flex flex-col mx-auto px-4 ${step === 'review' ? 'max-w-7xl min-h-[calc(100vh-120px)] pb-12' : 'max-w-5xl h-[calc(100vh-120px)] lg:px-0'}`}>
            {/* Header */}
            {step !== 'review' ? (
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => step === 'upload' ? navigate(-1) : handleRetake()}
                        className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="text-center">
                        <h1 className="text-xl font-bold">
                            {step === 'upload' ? 'Photo Log' : 'Analyzing...'}
                        </h1>
                    </div>
                    <div className="w-12" /> {/* Spacer */}
                </div>
            ) : (
                /* Stepper Header for Review Mode */
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-white/5">
                    {/* Left: Back button + Title */}
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <button
                            onClick={handleRetake}
                            className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                            title="Go back / Retake"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                <span>Review & Adjust</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                    Step 2 of 3
                                </span>
                            </h1>
                            <p className="text-xs text-white/50">
                                Verify detected items, confidence & portion estimates before confirming
                            </p>
                        </div>
                    </div>

                    {/* Middle: 3-step visual breadcrumb stepper matching inspo */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-md">
                        {/* Step 1: Detect & Segment (Completed) */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center text-xs font-bold shadow-sm">
                                <Check className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-bold text-white">1 Detect & Segment</div>
                                <div className="text-[10px] text-emerald-400/80 font-medium">Food items identified</div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="w-6 h-[1px] bg-white/20 mx-1" />

                        {/* Step 2: Review & Adjust (Active) */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center text-xs font-black shadow-md shadow-amber-500/20">
                                2
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-bold text-amber-300">2 Review & Adjust</div>
                                <div className="text-[10px] text-amber-400/80 font-medium">Edit portions if needed</div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="w-6 h-[1px] bg-white/10 mx-1" />

                        {/* Step 3: Confirm (Upcoming) */}
                        <div className="flex items-center gap-2.5 opacity-40">
                            <div className="w-6 h-6 rounded-full bg-white/5 border border-white/20 text-white/60 flex items-center justify-center text-xs font-bold">
                                3
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-bold text-white/70">3 Confirm</div>
                                <div className="text-[10px] text-white/40 font-medium">Save to log</div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        {analysisMeta?.pipeline_trace?.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsInspectorOpen(true)}
                                className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                                title="Inspect internal pipeline trace"
                            >
                                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                                <span>Inspect Pipeline</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleRetake}
                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-semibold text-xs flex items-center gap-2 transition-colors"
                        >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Retake Photo</span>
                        </button>
                    </div>
                </div>
            )}

            <AnimatePresence mode="wait">
                {step === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 flex flex-col justify-center"
                    >
                        {/* Mode Switcher */}
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <button
                                type="button"
                                className="px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider bg-white text-black flex items-center gap-2 shadow-sm cursor-pointer"
                            >
                                <Camera className="w-4 h-4" />
                                <span>Photo Log</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/log/search', { state: { mealType: selectedMealType } })}
                                className="px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Search className="w-4 h-4" />
                                <span>Search Food</span>
                            </button>
                        </div>

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

                            {upcomingTargets[selectedMealType.toLowerCase()] && (
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

                {step === 'analyzing' && (
                    <motion.div
                        key="analyzing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
                    >
                        {/* Left: Image Preview */}
                        <div className="flex justify-center">
                            <FoodDetectionPreview
                                image={image}
                                segmentedImage={segmentedImage}
                                isAnalyzing={true}
                                error={analysisError}
                                currentStage={currentStageIndex}
                                stageInfo={PIPELINE_STAGES[currentStageIndex - 1]}
                            />
                        </div>

                        {/* Right: 9-Stage Analysis Tracker */}
                        <div className="h-full max-h-[540px] flex flex-col justify-center">
                            <PipelineAnalysisTracker
                                currentStage={currentStageIndex}
                                isCompleted={isAnalysisComplete}
                            />
                        </div>
                    </motion.div>
                )}

                {step === 'review' && (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="w-full grid grid-cols-1 xl:grid-cols-12 gap-8 items-start"
                    >
                        {/* Left Column: Clean Meal Photo Viewer */}
                        <div className="xl:col-span-7 w-full">
                            <MealPhotoViewer
                                image={image}
                                segmentedImage={segmentedImage}
                                mealType={selectedMealType}
                            />
                        </div>

                        {/* Right Column: Enhanced Portion Editor with Auto-adjust, Sliders, Donut Chart & Confirm CTA */}
                        <div className="xl:col-span-5 w-full">
                            <EnhancedPortionEditor
                                items={detectedItems}
                                onUpdateItem={handleUpdateItem}
                                onDeleteItem={handleDeleteItem}
                                onAutoAdjust={handleAutoAdjust}
                                onConfirm={handleConfirm}
                                confidence={analysisMeta?.confidence || 0.94}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full Pipeline Debug Inspector Modal */}
            <PipelineInspectorModal
                isOpen={isInspectorOpen}
                onClose={() => setIsInspectorOpen(false)}
                trace={analysisMeta?.pipeline_trace || []}
                durationMs={analysisMeta?.pipeline_duration_ms || 0}
                summaryData={{
                    total_mass_g: analysisMeta?.total_mass_g,
                    total_items: detectedItems.length,
                    execution_target: analysisMeta?.execution_target,
                }}
            />
        </div>
    );
};

export default PhotoLogPage;

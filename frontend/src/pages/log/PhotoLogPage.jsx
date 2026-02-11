import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, RefreshCw } from 'lucide-react';
import PhotoUpload from '../../components/log/PhotoUpload';
import FoodDetectionPreview from '../../components/log/FoodDetectionPreview';
import PortionEditor from '../../components/log/PortionEditor';
import { mockFoodAnalysis } from '../../data/mockFoodAnalysis';

const PhotoLogPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('upload'); // upload, analyzing, review
    const [image, setImage] = useState(null);
    const [detectedItems, setDetectedItems] = useState([]);

    const handleImageSelect = (imageUrl) => {
        setImage(imageUrl);
        setStep('analyzing');
    };

    const handleAnalysisComplete = () => {
        // Initialize multiplier to 1 for all items
        const itemsWithMultiplier = mockFoodAnalysis.items.map(item => ({ ...item, multiplier: 1 }));
        setDetectedItems(itemsWithMultiplier);
        setStep('review');
    };

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
            items: detectedItems,
            totalCalories: Math.round(totalCalories)
        };

        navigate('/log/confirm', { state: { mealData: finalMealData } });
    };

    const handleRetake = () => {
        setImage(null);
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
                                isAnalyzing={step === 'analyzing'}
                                onAnalysisComplete={handleAnalysisComplete}
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

                                    <PortionEditor
                                        items={detectedItems}
                                        onUpdateItem={handleUpdateItem}
                                    />

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
                                                className="flex-1 py-4 bg-white text-black rounded-2xl font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
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

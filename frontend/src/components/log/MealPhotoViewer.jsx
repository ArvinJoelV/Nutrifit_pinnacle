import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

const MealPhotoViewer = ({ image, segmentedImage, mealType = 'Meal' }) => {
    const [showSegments, setShowSegments] = useState(Boolean(segmentedImage));

    return (
        <div className="relative w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 shadow-2xl group select-none">
            {/* Base Captured Food Photo */}
            <img
                src={image}
                alt="Captured meal"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
            />

            {/* Clean AI Segmentation Overlay (if available and toggled on) */}
            {showSegments && segmentedImage && (
                <motion.img
                    src={segmentedImage}
                    alt="Detected food segments"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-screen pointer-events-none"
                />
            )}

            {/* Top Left: Meal Badge */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/90 text-xs font-semibold shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{mealType} Photo</span>
            </div>

            {/* Top Right: Segments Toggle (only if segmentedImage exists) */}
            {segmentedImage && (
                <button
                    type="button"
                    onClick={() => setShowSegments(prev => !prev)}
                    className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors shadow-lg cursor-pointer"
                    title={showSegments ? 'Hide AI Segments' : 'Show AI Segments'}
                >
                    {showSegments ? (
                        <>
                            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                            <span>Hide Segments</span>
                        </>
                    ) : (
                        <>
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Show Segments</span>
                        </>
                    )}
                </button>
            )}

            {/* Bottom Subtle Gradient Bar */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </div>
    );
};

export default MealPhotoViewer;

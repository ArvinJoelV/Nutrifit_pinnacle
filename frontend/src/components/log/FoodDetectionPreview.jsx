import React from 'react';
import { motion } from 'framer-motion';
import { ScanLine, CheckCircle2, AlertTriangle } from 'lucide-react';

const FoodDetectionPreview = ({ image, segmentedImage, isAnalyzing, error }) => {
    const showSegmented = !isAnalyzing && segmentedImage;

    return (
        <div className="relative w-full max-w-md mx-auto aspect-square rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
            <img src={image} alt="Food Preview" className="w-full h-full object-cover" />
            {showSegmented && (
                <motion.img
                    src={segmentedImage}
                    alt="Segmented meal"
                    initial={{ opacity: 0, scale: 1.06 }}
                    animate={{ opacity: 0.95, scale: 1 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-screen"
                />
            )}

            {/* Analyzing Overlay */}
            {isAnalyzing && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center backdrop-blur-xs">
                    <motion.div
                        initial={{ y: -150, opacity: 0 }}
                        animate={{ y: [-150, 150, -150], opacity: 1 }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                        className="absolute w-full h-1 bg-primary shadow-[0_0_20px_rgba(34,211,238,0.8)] z-10"
                    />

                    <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 border border-white/10">
                        <ScanLine className="w-5 h-5 text-primary animate-pulse" />
                        <span className="font-bold tracking-wide">Analyzing Image...</span>
                    </div>
                </div>
            )}

            {!isAnalyzing && !error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none"
                >
                    <div className="bg-emerald-500/20 backdrop-blur-md p-6 rounded-full border border-emerald-500/50">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    </div>
                </motion.div>
            )}

            {error && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-5">
                    <div className="bg-rose-500/20 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                        <p className="text-sm text-rose-100">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FoodDetectionPreview;

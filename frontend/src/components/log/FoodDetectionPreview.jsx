import React from 'react';
import { motion } from 'framer-motion';
import { ScanLine, CheckCircle2, AlertTriangle } from 'lucide-react';

const FoodDetectionPreview = ({ image, segmentedImage, isAnalyzing, error, stageInfo, currentStage = 1 }) => {
    const showSegmented = !isAnalyzing && segmentedImage;

    return (
        <div className="relative w-full max-w-md mx-auto aspect-square rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group">
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

            {/* Analyzing Overlay with Real-time HUD */}
            {isAnalyzing && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-between p-6 backdrop-blur-xs">
                    {/* Laser Scanner Bar */}
                    <motion.div
                        initial={{ y: -160, opacity: 0 }}
                        animate={{ y: [-160, 160, -160], opacity: 1 }}
                        transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                        className="absolute w-full h-1 bg-linear-to-r from-transparent via-primary to-transparent shadow-[0_0_25px_rgba(34,211,238,0.9)] z-10"
                    />

                    {/* HUD Viewfinder Reticle Corners */}
                    <div className="absolute inset-4 pointer-events-none border border-white/10 rounded-[2rem]">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-xl" />
                    </div>

                    {/* HUD Top Tag */}
                    <div className="relative z-10 w-full flex items-center justify-between text-[10px] font-mono font-bold text-white/50 uppercase tracking-widest px-2">
                        <span className="flex items-center gap-1.5 text-primary">
                            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                            CV SCANNING
                        </span>
                        <span>STAGE {currentStage}/9</span>
                    </div>

                    {/* HUD Center / Bottom Stage Information Pill */}
                    <motion.div
                        key={currentStage}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative z-10 bg-black/75 backdrop-blur-md px-5 py-3 rounded-2xl flex flex-col items-center gap-1 border border-white/15 max-w-[90%] text-center shadow-xl"
                    >
                        <div className="flex items-center gap-2">
                            <ScanLine className="w-4 h-4 text-primary animate-pulse" />
                            <span className="font-extrabold text-sm text-white tracking-wide">
                                {stageInfo?.name || 'Analyzing Food...'}
                            </span>
                        </div>
                        {stageInfo?.desc && (
                            <span className="text-[11px] text-white/60 line-clamp-1">
                                {stageInfo.desc}
                            </span>
                        )}
                    </motion.div>

                    {/* HUD Bottom Tech Stamp */}
                    <div className="relative z-10 text-[10px] font-mono text-white/40 tracking-wider">
                        {stageInfo?.tech || 'YOLOv8 + SAM2 + 3D'}
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

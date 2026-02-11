import React from 'react';
import { motion } from 'framer-motion';

const CravingsMeter = ({ risk, time }) => {
    // Risk: Low, Medium, High
    const getColor = () => {
        if (risk === 'High') return 'bg-rose-500';
        if (risk === 'Medium') return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    const getWidth = () => {
        if (risk === 'High') return '80%';
        if (risk === 'Medium') return '50%';
        return '20%';
    };

    return (
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Cravings Forecast</h3>

            <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-black">{risk} Risk</span>
                <span className="text-sm font-medium text-white/60">Expected in ~{time}</span>
            </div>

            <div className="h-4 bg-white/10 rounded-full overflow-hidden relative">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: getWidth() }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${getColor()} relative`}
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
            </div>

            <p className="mt-4 text-xs text-white/50 leading-relaxed">
                {risk === 'High'
                    ? "Blood sugar volatility detected. Keep a healthy snack ready."
                    : "Stable metabolic state. Low chance of snack attacks."}
            </p>
        </div>
    );
};

export default CravingsMeter;

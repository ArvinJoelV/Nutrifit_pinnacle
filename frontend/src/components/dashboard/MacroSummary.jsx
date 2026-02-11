import React from 'react';
import { motion } from 'framer-motion';

const MacroCard = ({ title, data, delay }) => {
    const percentage = Math.min((data.current / data.target) * 100, 100);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay, duration: 0.4 }}
            className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex flex-col justify-between h-40 relative overflow-hidden group hover:bg-white/10 transition-colors duration-300"
        >
            <div className="flex justify-between items-start z-10">
                <span className="text-xs font-bold uppercase tracking-widest text-white/40">{title}</span>
                <span className="text-xs font-bold text-white/40">{data.target}{data.unit}</span>
            </div>

            <div className="z-10">
                <div className="text-3xl font-black mb-1">{data.current}</div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: delay + 0.2, duration: 1, ease: "circOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: data.color }}
                    />
                </div>
            </div>

            {/* Decorative colored glow */}
            <div
                className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-20 transition-opacity duration-300 group-hover:opacity-30"
                style={{ backgroundColor: data.color }}
            />
        </motion.div>
    );
};

const MacroSummary = ({ macros }) => {
    return (
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(macros).map(([key, value], index) => (
                <MacroCard
                    key={key}
                    title={key}
                    data={value}
                    delay={index * 0.1}
                />
            ))}
        </div>
    );
};

export default MacroSummary;

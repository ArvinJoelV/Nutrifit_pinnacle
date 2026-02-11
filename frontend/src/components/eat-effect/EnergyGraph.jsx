import React from 'react';
import { motion } from 'framer-motion';

const EnergyGraph = ({ data, comparisonData }) => {
    // Helper to generate path string from data points
    const getPath = (pointsArray) => {
        if (!pointsArray) return "";
        const points = pointsArray.map((val, i) => `${i * 75},${150 - val * 1.2}`);
        return `M ${points[0]} C ${points[0].replace(',', ' ')} ${points[1]} ${points[1]} S ${points[2]} ${points[2]} S ${points[3]} ${points[3]} L ${points[4]}`;
    };

    const pathData = getPath(data);
    const comparisonPathData = getPath(comparisonData);

    return (
        <div className="w-full bg-linear-to-b from-white/5 to-transparent rounded-3xl p-6 border border-white/5 relative overflow-hidden">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Predicted Energy Level</h3>

            <div className="relative h-[150px] w-full">
                <svg viewBox="0 0 300 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    {/* Gradient Definition */}
                    <defs>
                        <linearGradient id="energyGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    {[0, 1, 2, 3, 4].map(i => (
                        <line key={i} x1={i * 75} y1="0" x2={i * 75} y2="150" stroke="white" strokeOpacity="0.05" strokeDasharray="4" />
                    ))}

                    {/* COMPARISON LINE (Ghost) */}
                    {comparisonData && (
                        <motion.path
                            d={comparisonPathData}
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeOpacity="0.2"
                            strokeDasharray="5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1 }}
                        />
                    )}

                    {/* Area fill */}
                    <motion.path
                        d={`${pathData} L 300,150 L 0,150 Z`}
                        fill="url(#energyGradient)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, d: `${pathData} L 300,150 L 0,150 Z` }}
                        transition={{ duration: 1 }}
                    />

                    {/* The Main Line */}
                    <motion.path
                        d={pathData}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1, d: pathData }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                    />

                    {/* Dots at points */}
                    {data.map((val, i) => (
                        <motion.circle
                            key={i}
                            cx={i * 75}
                            cy={150 - val * 1.2}
                            r="4"
                            fill="#fff"
                            animate={{ cy: 150 - val * 1.2 }}
                            transition={{ duration: 1 }}
                        />
                    ))}
                </svg>

                {/* Legend if comparison is active */}
                {comparisonData && (
                    <div className="absolute top-0 right-0 flex gap-4 text-[10px] font-bold uppercase">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-white/20" />
                            <span className="text-white/40">Original</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-cyan-400" />
                            <span className="text-cyan-400">Simulated</span>
                        </div>
                    </div>
                )}

                {/* X-Axis Labels */}
                <div className="flex justify-between mt-2 text-xs text-white/40 font-bold px-1">
                    <span>Now</span>
                    <span>1h</span>
                    <span>2h</span>
                    <span>3h</span>
                    <span>4h</span>
                </div>
            </div>
        </div>
    );
};

export default EnergyGraph;

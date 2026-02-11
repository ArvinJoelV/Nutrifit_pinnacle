import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Footprints } from 'lucide-react';

const SimulationControls = ({ modifiers, setModifiers }) => {

    const handlePortionChange = (e) => {
        setModifiers(prev => ({ ...prev, portion: parseFloat(e.target.value) }));
    };

    const toggleWalk = () => {
        setModifiers(prev => ({ ...prev, walk10min: !prev.walk10min }));
    };

    const addProtein = () => {
        setModifiers(prev => ({ ...prev, addProtein: (prev.addProtein || 0) + 10 }));
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-8">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-sm text-white/60">Portion Adjustment</span>
                    <span className="font-black text-xl text-primary">{Math.round(modifiers.portion * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={modifiers.portion}
                    onChange={handlePortionChange}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
            </div>

            <div>
                <h4 className="font-bold text-sm text-white/60 mb-4">Metabolic Hacks</h4>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={toggleWalk}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${modifiers.walk10min
                                ? 'bg-primary/20 border-primary text-white'
                                : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                            }`}
                    >
                        <Footprints className="w-5 h-5" />
                        <div className="text-left">
                            <div className="font-bold text-sm">10m Walk</div>
                            <div className="text-[10px] opacity-70">Post-meal</div>
                        </div>
                    </button>

                    <button
                        onClick={addProtein}
                        className={`flex items-center gap-3 p-4 rounded-2xl border border-transparent bg-white/5 hover:bg-white/10 text-white/60 transition-colors`}
                    >
                        <div className="p-1 bg-white/10 rounded-lg">
                            <Plus className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-sm">Add Protein</div>
                            <div className="text-[10px] opacity-70">{(modifiers.addProtein || 0)}g added</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SimulationControls;

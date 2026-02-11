import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowUpRight } from 'lucide-react';

const EatEffectWidget = ({ data }) => {
    return (
        <div className="col-span-12 lg:col-span-6 bg-linear-to-br from-accent-light/10 to-accent/5 border border-accent-light/20 rounded-[2.5rem] p-8 relative overflow-hidden group cursor-pointer hover:border-accent-light/40 transition-colors">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-accent-light/20 rounded-2xl text-accent-light">
                        <Activity className="w-6 h-6" />
                    </div>
                    <span className="px-4 py-1.5 rounded-full bg-accent-light/10 border border-accent-light/20 text-accent-light text-xs font-bold uppercase tracking-widest">
                        Insight
                    </span>
                </div>

                <h3 className="text-2xl font-black mb-2">{data.insight}</h3>
                <p className="text-white/60 font-medium mb-6 leading-relaxed max-w-sm">
                    {data.description}
                </p>

                <div className="flex items-center gap-2 text-white/40 group-hover:text-white transition-colors font-bold text-sm">
                    <span>View Analysis</span>
                    <ArrowUpRight className="w-4 h-4" />
                </div>
            </div>

            {/* Background Graphic */}
            <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500">
                <Activity className="w-64 h-64" />
            </div>
        </div>
    );
};

export default EatEffectWidget;

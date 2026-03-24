import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Search, ScanLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuickActions = () => {
    const navigate = useNavigate();

    return (
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/log?mode=camera')}
                className="bg-white text-black p-6 rounded-[2rem] flex flex-col items-start justify-between min-h-[160px] relative overflow-hidden group"
            >
                <div className="bg-black/5 p-3 rounded-2xl group-hover:bg-black/10 transition-colors">
                    <Camera className="w-6 h-6" />
                </div>
                <div>
                    <span className="block text-2xl font-black tracking-tight">Photo Log</span>
                    <span className="text-xs font-bold opacity-60 uppercase tracking-widest">Snap & Eat</span>
                </div>
                <div className="absolute -right-4 -bottom-4 bg-black/5 w-24 h-24 rounded-full" />
            </motion.button>

            <div className="flex flex-col gap-4 h-full">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/log?mode=search')}
                    className="flex-1 bg-white/10 border border-white/10 rounded-[2rem] p-5 flex items-center gap-4 hover:bg-white/20 transition-colors text-left"
                >
                    <div className="p-2 bg-white/10 rounded-xl">
                        <Search className="w-5 h-5" />
                    </div>
                    <span className="font-bold">Search Food</span>
                </motion.button>


            </div>
        </div>
    );
};

export default QuickActions;

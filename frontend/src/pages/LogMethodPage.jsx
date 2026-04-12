import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Search, ChevronRight, ArrowLeft } from 'lucide-react';

const LogMethodPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const selectedMealType = location.state?.mealType || 'Snack';

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto px-4 lg:px-0 justify-center"
        >
            <motion.div variants={itemVariants} className="text-center mb-10">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors mx-auto flex"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>

                {/* BLEND TEXT */}
                <h1 className="text-4xl md:text-5xl font-black mb-4 text-white mix-blend-difference">
                    Log {selectedMealType}
                </h1>

                <p className="text-white/60 text-lg">
                    Choose your preferred logging method
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">

                {/* SNAP OPTION */}
                <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/log/photo', { state: { mealType: selectedMealType } })}
                    className="group relative overflow-hidden bg-linear-to-br from-primary/20 to-primary-light/5 border border-primary/20 hover:border-primary/50 rounded-[3rem] p-10 cursor-pointer transition-all duration-300 min-h-[300px] flex flex-col justify-between"
                >

                    {/* BIG ICON (under layer) */}
                    <Camera className="absolute right-[-10%] bottom-[-10%] w-64 h-64 text-white -rotate-12 group-hover:rotate-0 transition-transform duration-500 z-0" />

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform duration-300">
                            <Camera className="w-8 h-8" />
                        </div>

                        {/* BLEND TEXT */}
                        <h2 className="text-3xl font-bold mb-2 text-white mix-blend-difference">
                            Snap Your Meal
                        </h2>

                        <p className="text-white/60 text-sm font-medium leading-relaxed max-w-[80%]">
                            Take a quick photo and let our AI analyze calories and macros instantly.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-2 text-primary font-bold mt-8 group-hover:translate-x-2 transition-transform">
                        <span>Open Camera</span>
                        <ChevronRight className="w-5 h-5" />
                    </div>

                    <div className="absolute right-[-20%] bottom-[-20%] w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover:bg-primary/30 transition-colors" />
                </motion.div>

                {/* SEARCH OPTION */}
                <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/log/search', { state: { mealType: selectedMealType } })}
                    className="group relative overflow-hidden bg-linear-to-br from-secondary/20 to-secondary-light/5 border border-secondary/20 hover:border-secondary/50 rounded-[3rem] p-10 cursor-pointer transition-all duration-300 min-h-[300px] flex flex-col justify-between"
                >

                    {/* BIG ICON */}
                    <Search className="absolute right-[-10%] bottom-[-10%] w-64 h-64 text-white -rotate-12 group-hover:rotate-0 transition-transform duration-500 z-0" />

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mb-6 text-secondary group-hover:scale-110 transition-transform duration-300">
                            <Search className="w-8 h-8" />
                        </div>

                        {/* BLEND TEXT */}
                        <h2 className="text-3xl font-bold mb-2 text-white mix-blend-difference">
                            Search Database
                        </h2>

                        <p className="text-white/60 text-sm font-medium leading-relaxed max-w-[80%]">
                            Search millions of verified foods, branded items, and restaurant meals.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-2 text-secondary font-bold mt-8 group-hover:translate-x-2 transition-transform">
                        <span>Start Searching</span>
                        <ChevronRight className="w-5 h-5" />
                    </div>

                    <div className="absolute right-[-20%] bottom-[-20%] w-64 h-64 bg-secondary/20 rounded-full blur-[80px] group-hover:bg-secondary/30 transition-colors" />
                </motion.div>

            </div>
        </motion.div>
    );
};

export default LogMethodPage;
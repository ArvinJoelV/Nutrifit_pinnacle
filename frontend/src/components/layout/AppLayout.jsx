import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const AppLayout = ({ children }) => {
    const location = useLocation();

    // Animation variants for page transitions
    const pageVariants = {
        initial: {
            opacity: 0,
            y: 20,
            scale: 0.98
        },
        enter: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.4,
                ease: [0.25, 1, 0.5, 1] // Cubic bezier for smoothness
            }
        },
        exit: {
            opacity: 0,
            y: -20,
            scale: 1.02,
            transition: {
                duration: 0.3,
                ease: "easeIn"
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#060606] text-white flex overflow-hidden relative">
            {/* Animated Background Orbs - Persist across routes */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-light/5 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-secondary-light/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '-2s' }} />
            </div>

            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-64 relative z-10 w-full mb-20 lg:mb-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        variants={pageVariants}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        className="min-h-screen p-6 md:p-8 lg:p-12 max-w-7xl mx-auto"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
};

export default AppLayout;

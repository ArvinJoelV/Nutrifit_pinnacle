import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Footprints, Activity } from 'lucide-react';

const StatChip = ({ icon: Icon, value, label, iconClassName = '' }) => (
    <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md px-5 py-3 rounded-full border border-white/10">
        <Icon className={`w-5 h-5 ${iconClassName}`} />
        <div className="flex flex-col">
            <span className="text-xl font-black leading-none">{value}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/50">{label}</span>
        </div>
    </div>
);

const WelcomeCard = ({ user }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="col-span-12 relative overflow-hidden rounded-[3rem] bg-linear-to-br from-primary/80 to-primary-light/20 border border-white/10 p-8 md:p-10"
        >
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter mb-2">
                        {user.greeting}, {user.name}!
                    </h1>
                    <p className="text-white/70 text-lg font-medium">
                        You're on a roll. Keep crushing your goals today.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <StatChip icon={Flame} value={user.streak} label="Day Streak" iconClassName="text-orange-400 fill-orange-400" />
                    <StatChip icon={Footprints} value={user.steps || '0'} label="Steps" iconClassName="text-emerald-300" />
                    <StatChip icon={Activity} value={user.caloriesBurned || '0'} label="Calories" iconClassName="text-amber-200" />
                </div>
            </div>

            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        </motion.div>
    );
};

export default WelcomeCard;

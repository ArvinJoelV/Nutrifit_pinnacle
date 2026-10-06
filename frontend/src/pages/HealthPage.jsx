import React from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, Flame, ShieldCheck, Activity, Watch, Sparkles, CheckCircle2 } from 'lucide-react';
import HealthDataPanel from '../components/health/HealthDataPanel';

const HealthPage = () => {
  const pillars = [
    {
      title: 'Metabolic Energy Burn',
      description: 'Wearable active burn continuously expands your daily calorie and carbohydrate budget.',
      icon: Flame,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/25',
    },
    {
      title: 'Cardiovascular Strain',
      description: 'Continuous average & resting BPM monitoring to assess exertion and recovery readiness.',
      icon: HeartPulse,
      color: 'text-rose-400 bg-rose-500/15 border-rose-500/25',
    },
    {
      title: 'Hypoglycemia Defense',
      description: 'Automatic safety alerts if high daily steps coincide with unconsumed carbohydrate targets.',
      icon: ShieldCheck,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
    },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-0 max-w-7xl mx-auto">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent p-8 md:p-10 backdrop-blur-xl relative overflow-hidden shadow-2xl"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 text-emerald-300 shrink-0 shadow-lg shadow-emerald-500/10">
              <HeartPulse className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Telemetry Live</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Google Fit • Fitbit Watch
                </span>
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-black text-white tracking-tight">
                Health & Wearable Intelligence
              </h1>
              <p className="mt-2 max-w-2xl text-xs md:text-sm text-white/55 leading-relaxed">
                Your continuous sensor telemetry streams directly into the NutriFit agentic AI engine, adjusting meal portions and evaluating diabetic safety in real time.
              </p>
            </div>
          </div>
        </div>

        {/* Ambient Gradient Glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
      </motion.div>

      {/* 3 Intelligence Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-3xl p-5.5 backdrop-blur-md transition-all shadow-sm"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className={`p-2.5 rounded-2xl border ${pillar.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-white tracking-tight">
                  {pillar.title}
                </h3>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Main Interactive Telemetry & Sync Hub */}
      <HealthDataPanel showHeader={true} />
    </div>
  );
};

export default HealthPage;

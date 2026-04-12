import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  BrainCircuit,
  Clock3,
  Flame,
  Loader2,
  MoonStar,
  Sparkles,
  Waves,
} from 'lucide-react';
import { getMealLog } from '../../services/mealService';
import { getMealEatEffectTimeline } from '../../services/eatEffectService';

const toneStyles = {
  emerald: {
    chip: 'bg-emerald-400/15 text-emerald-200 border border-emerald-300/20',
    glow: 'from-emerald-400/18 via-emerald-300/10 to-transparent',
    dot: 'bg-emerald-400',
    text: 'text-emerald-200',
  },
  amber: {
    chip: 'bg-amber-300/15 text-amber-100 border border-amber-300/20',
    glow: 'from-amber-300/18 via-amber-200/10 to-transparent',
    dot: 'bg-amber-300',
    text: 'text-amber-100',
  },
  rose: {
    chip: 'bg-rose-400/15 text-rose-100 border border-rose-300/20',
    glow: 'from-rose-400/18 via-rose-300/10 to-transparent',
    dot: 'bg-rose-400',
    text: 'text-rose-100',
  },
  cyan: {
    chip: 'bg-cyan-400/15 text-cyan-100 border border-cyan-300/20',
    glow: 'from-cyan-400/18 via-cyan-300/10 to-transparent',
    dot: 'bg-cyan-400',
    text: 'text-cyan-100',
  },
  violet: {
    chip: 'bg-violet-400/15 text-violet-100 border border-violet-300/20',
    glow: 'from-violet-400/18 via-violet-300/10 to-transparent',
    dot: 'bg-violet-400',
    text: 'text-violet-100',
  },
};

const defaultTone = toneStyles.cyan;

const formatTimelineTime = (offsetMinutes = 0) => {
  if (offsetMinutes <= 0) return 'Now';
  if (offsetMinutes < 60) return `${Math.round(offsetMinutes)} min`;
  const hours = offsetMinutes / 60;
  if (Math.abs(hours - Math.round(hours)) < 0.15) return `${Math.round(hours)} hr`;
  return `${hours.toFixed(1)} hr`;
};

const curvePath = (points = []) => {
  if (!points.length) return '';
  const width = 320;
  const height = 120;
  const step = width / Math.max(points.length - 1, 1);
  const mapped = points.map((point, index) => {
    const x = index * step;
    const y = height - ((Math.max(0, Math.min(100, point)) / 100) * height);
    return `${x},${y}`;
  });

  if (mapped.length < 2) return `M ${mapped[0] || '0,0'}`;

  let path = `M ${mapped[0]}`;
  for (let index = 1; index < mapped.length; index += 1) {
    const previous = mapped[index - 1].split(',').map(Number);
    const current = mapped[index].split(',').map(Number);
    const controlX = (previous[0] + current[0]) / 2;
    path += ` C ${controlX},${previous[1]} ${controlX},${current[1]} ${current[0]},${current[1]}`;
  }
  return path;
};

const StatPill = ({ icon: Icon, label, value, tone = 'cyan' }) => {
  const style = toneStyles[tone] || defaultTone;
  return (
    <div className={`rounded-[1.4rem] px-4 py-3 ${style.chip} backdrop-blur-md`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  );
};

const CurveCard = ({ title, subtitle, points, color, accent }) => {
  const path = useMemo(() => curvePath(points), [points]);
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{title}</div>
          <div className="mt-2 text-sm text-white/55">{subtitle}</div>
        </div>
        <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${accent}`}>
          Live arc
        </div>
      </div>

      <div className="mt-5 h-[150px] rounded-[1.6rem] border border-white/8 bg-black/20 px-4 py-4">
        <svg viewBox="0 0 320 120" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((index) => (
            <line
              key={index}
              x1={index * 80}
              y1="0"
              x2={index * 80}
              y2="120"
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 6"
            />
          ))}
          <motion.path
            d={`${path} L 320,120 L 0,120 Z`}
            fill={`url(#gradient-${title})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
          <motion.path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          />
          {points.map((point, index) => (
            <motion.circle
              key={`${title}-${index}`}
              cx={index * 80}
              cy={120 - ((Math.max(0, Math.min(100, point)) / 100) * 120)}
              r="4"
              fill="white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.08 }}
            />
          ))}
        </svg>
        <div className="mt-2 flex justify-between px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/30">
          <span>Now</span>
          <span>+1h</span>
          <span>+2h</span>
          <span>+3h</span>
          <span>+4h</span>
        </div>
      </div>
    </div>
  );
};

const MealEatEffectTimelinePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meal, setMeal] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadTimeline = async () => {
      setLoading(true);
      setError('');
      try {
        const mealLog = await getMealLog(id);
        if (cancelled) return;
        setMeal(mealLog);

        const timelinePayload = await getMealEatEffectTimeline(mealLog);
        if (cancelled) return;
        setTimeline(timelinePayload);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Unable to load Eat Effect timeline.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/70">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Building your Eat Effect timeline...</span>
        </div>
      </div>
    );
  }

  if (error || !meal || !timeline) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-6">
        <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-white/55 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="rounded-[2rem] border border-rose-400/20 bg-rose-400/10 p-8">
          <div className="text-sm font-bold uppercase tracking-[0.22em] text-rose-200/70">Eat Effect unavailable</div>
          <div className="mt-3 text-lg font-bold text-white">{error || 'Something went wrong while loading the meal timeline.'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6">
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Back to meal</span>
        </button>
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/30">Signature feature</div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.8rem] border border-white/10 bg-linear-to-br from-cyan-400/16 via-violet-400/10 to-white/[0.03] p-8 md:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.14),transparent_25%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-black/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                {meal.type} • {Math.round(meal.totalCalories || 0)} kcal
              </div>
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-black tracking-tight text-white max-w-3xl">
              {timeline.hero.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base md:text-lg text-white/65">
              {timeline.hero.subtitle}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <StatPill icon={Sparkles} label="Metabolic mood" value={timeline.hero.metabolicMood} tone="violet" />
              <StatPill icon={Clock3} label="Digestion window" value={`${timeline.digestionHours}h`} tone="cyan" />
              <StatPill icon={Flame} label="Appetite rebound" value={timeline.cravings.level} tone={timeline.cravings.level === 'High' ? 'rose' : timeline.cravings.level === 'Medium' ? 'amber' : 'emerald'} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-full xl:min-w-[420px] xl:max-w-[460px]">
            {(timeline.highlights || []).slice(0, 3).map((item) => {
              const style = toneStyles[item.tone] || defaultTone;
              return (
                <div key={item.label} className="rounded-[1.6rem] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                  <div className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${style.chip}`}>
                    {item.label}
                  </div>
                  <div className="mt-4 text-2xl font-black text-white">{item.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CurveCard
              title="Energy Arc"
              subtitle="How alertness and steadiness are likely to feel over the next few hours."
              points={timeline.energyCurve}
              color="#22d3ee"
              accent="bg-cyan-400/12 text-cyan-100 border border-cyan-300/20"
            />
            <CurveCard
              title="Glucose Pace"
              subtitle="A time-based view of how quickly this meal may rise, settle, and land."
              points={timeline.glucoseCurve}
              color="#f59e0b"
              accent="bg-amber-300/12 text-amber-100 border border-amber-300/20"
            />
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-cyan-200">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Coach note</div>
                <p className="mt-3 text-sm md:text-base text-white/70 leading-relaxed">{timeline.coachNote}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Signal board</div>
            <div className="mt-5 grid gap-3">
              <StatPill icon={Activity} label="Main response" value={timeline.cravings.time} tone="cyan" />
              <StatPill icon={MoonStar} label="Sleep impact" value={`${timeline.sleepImpact}%`} tone="violet" />
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
                  <Waves className="w-4 h-4" />
                  <span>Late landing note</span>
                </div>
                <p className="mt-3 text-sm text-white/65 leading-relaxed">{timeline.cravings.reason}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="rounded-[2.4rem] border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Timeline</div>
              <h2 className="mt-3 text-2xl md:text-3xl font-black text-white">From first bite to afterglow</h2>
            </div>
            <div className="text-sm text-white/45">Built around the next few hours of your current meal</div>
          </div>

          <div className="mt-8 relative">
            <div className="absolute left-[17px] top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-5">
              {timeline.timeline.map((item, index) => {
                const style = toneStyles[item.tone] || defaultTone;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -14 : 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + (index * 0.08) }}
                    className="relative pl-12"
                  >
                    <div className={`absolute left-0 top-4 h-9 w-9 rounded-full ${style.dot} shadow-[0_0_24px_currentColor]`} />
                    <div className="rounded-[1.8rem] border border-white/10 bg-black/20 overflow-hidden">
                      <div className={`h-1 bg-linear-to-r ${style.glow}`} />
                      <div className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${style.chip}`}>
                                {item.phase}
                              </div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/30">
                                {formatTimelineTime(item.offsetMinutes)}
                              </div>
                            </div>
                            <h3 className="mt-4 text-xl font-black text-white">{item.headline}</h3>
                            <p className="mt-3 text-sm text-white/65 leading-relaxed">{item.body}</p>
                          </div>
                          <div className="min-w-[90px] rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Impact</div>
                            <div className={`mt-2 text-2xl font-black ${style.text}`}>{item.impactScore}</div>
                          </div>
                        </div>

                        {item.microSignals?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.microSignals.map((signal) => (
                              <div key={signal} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
                                {signal}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="rounded-[2.4rem] border border-white/10 bg-linear-to-br from-white/[0.06] to-white/[0.02] p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 text-cyan-200">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Summary</div>
              <h3 className="mt-3 text-2xl font-black text-white">How this meal is likely to play out</h3>
              <p className="mt-4 max-w-4xl text-sm md:text-base text-white/68 leading-relaxed">
                {timeline.coachNote}
              </p>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Response style</div>
                  <div className="mt-2 text-lg font-black text-white">{timeline.hero.metabolicMood}</div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Most active window</div>
                  <div className="mt-2 text-lg font-black text-white">{timeline.cravings.time}</div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Full arc length</div>
                  <div className="mt-2 text-lg font-black text-white">{timeline.digestionHours} hours</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default MealEatEffectTimelinePage;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, Edit2, Activity, ChevronRight, Clock } from 'lucide-react';
import { getMealLog, deleteMealLog } from '../../services/mealService';

const MealDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [log, setLog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        const fetchLog = async () => {
            try {
                const data = await getMealLog(id);
                setLog(data);
            } catch (err) {
                console.error(err);
                navigate('/home');
            } finally {
                setLoading(false);
            }
        };
        fetchLog();
    }, [id, navigate]);

    const handleDelete = async () => {
        await deleteMealLog(id);
        navigate('/home');
    };

    const handleEdit = () => {
        // Navigate to confirm page with current data for editing
        navigate('/log/confirm', {
            state: {
                mealData: {
                    items: log.items,
                    totalCalories: log.totalCalories
                },
                // We'd need to handle 'update' mode in ConfirmPage strictly speaking, 
                // but for now this acts as "Clone & Edit" or "Re-save"
                // A full "Update" implementation would require passing the ID back.
            }
        });
    };

    if (loading) return <div className="min-h-screen bg-[#060606] flex items-center justify-center">Loading...</div>;
    if (!log) return null;

    return (
        <div className="min-h-screen bg-[#060606] flex flex-col max-w-lg mx-auto pb-24">
            {/* Header */}
            <div className="p-6 flex justify-between items-center sticky top-0 bg-[#060606]/80 backdrop-blur-xl z-20">
                <button onClick={() => navigate('/home')} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg">{log.type}</span>
                    <span className="text-xs text-white/40 font-medium">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleEdit} className="p-3 bg-white/5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                        <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="p-3 bg-white/5 rounded-full hover:bg-rose-500/20 text-white/60 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="px-6 space-y-6">
                {/* Summary Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-linear-to-br from-white/10 to-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <div className="text-5xl font-black mb-2 tracking-tight">{Math.round(log.totalCalories)}</div>
                        <div className="text-sm font-bold text-white/40 uppercase tracking-widest mb-8">Calories</div>

                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { val: log.macros.protein, label: 'Protein', color: 'text-emerald-400' },
                                { val: log.macros.carbs, label: 'Carbs', color: 'text-amber-400' },
                                { val: log.macros.fat, label: 'Fat', color: 'text-rose-400' }
                            ].map(m => (
                                <div key={m.label} className="flex flex-col">
                                    <span className={`text-xl font-bold ${m.color}`}>{Math.round(m.val)}g</span>
                                    <span className="text-[10px] text-white/40 uppercase font-bold">{m.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Eat -> Effect Call to Action */}
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => navigate('/eat-effect')}
                    className="w-full relative group overflow-hidden rounded-3xl p-[1px]"
                >
                    <div className="absolute inset-0 bg-linear-to-r from-teal-400 via-blue-500 to-purple-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-[#0a0a0a] rounded-[23px] px-6 py-4 flex items-center justify-between group-hover:bg-black/80 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-linear-to-br from-teal-400/20 to-blue-500/20 rounded-xl">
                                <Activity className="w-6 h-6 text-teal-400" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-lg">View Eat → Effect</div>
                                <div className="text-xs text-white/60">See metabolic impact</div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                    </div>
                </motion.button>

                {/* Simulator Button */}
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    onClick={() => navigate(`/meal/${id}/simulator`)}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-4 flex items-center justify-between hover:bg-white/10 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-500/20 rounded-xl">
                            <Activity className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-lg">What If? Simulator</div>
                            <div className="text-xs text-white/60">Experiment with portions</div>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                </motion.button>

                {/* Time Info */}
                <div className="flex items-center gap-3 px-2 py-2">
                    <Clock className="w-4 h-4 text-white/40" />
                    <span className="text-sm font-medium text-white/60">Logged at {log.time}</span>
                </div>

                {/* Food List */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest px-2">Items</h3>
                    {log.items.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + (i * 0.05) }}
                            className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center"
                        >
                            <div>
                                <div className="font-bold">{item.name}</div>
                                <div className="flex gap-3 mt-1 text-xs text-white/40 font-medium">
                                    <span>{Math.round(item.protein * (item.multiplier || 1))}p</span>
                                    <span>{Math.round(item.carbs * (item.multiplier || 1))}c</span>
                                    <span>{Math.round(item.fat * (item.multiplier || 1))}f</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-lg">{Math.round(item.calories * (item.multiplier || 1))}</div>
                                <div className="text-[10px] text-white/40 uppercase">kcal</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
                            onClick={() => setShowDeleteConfirm(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[#121212] border border-white/10 rounded-[2rem] p-8 z-50 text-center shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Delete this meal?</h3>
                            <p className="text-white/60 mb-8">This action cannot be undone and will remove these calories from your daily total.</p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 py-3 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MealDetailPage;

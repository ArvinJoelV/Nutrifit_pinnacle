import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

const InsightCard = ({ insight, index }) => {
    const [feedback, setFeedback] = useState(null);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="group relative overflow-hidden rounded-[2.5rem] bg-white/5 border border-white/5 p-1 transition-all hover:bg-white/10"
        >
            <div className={`absolute inset-0 opacity-10 bg-linear-to-br ${insight.color}`} />

            <div className="relative z-10 p-6 flex gap-5">
                <div className={`shrink-0 w-12 h-12 rounded-2xl bg-linear-to-br ${insight.color} flex items-center justify-center text-white shadow-lg`}>
                    <insight.icon className="w-6 h-6" />
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest bg-linear-to-r ${insight.color} bg-clip-text text-transparent`}>
                            {insight.category}
                        </span>
                    </div>

                    <h3 className="text-xl font-bold mb-2 text-white">{insight.title}</h3>
                    <p className="text-white/60 mb-4 text-sm leading-relaxed">{insight.message}</p>

                    {insight.action && (
                        <div className="inline-block px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-xs font-bold text-white/80">
                            💡 Tip: {insight.action}
                        </div>
                    )}
                </div>
            </div>

            {/* Interactive Footer */}
            <div className="relative z-10 border-t border-white/5 p-4 flex justify-between items-center bg-black/20">
                <span className="text-xs font-medium text-white/40">Was this helpful?</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFeedback('up')}
                        className={`p-2 rounded-xl transition-colors ${feedback === 'up' ? 'text-emerald-400 bg-emerald-400/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                    >
                        <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setFeedback('down')}
                        className={`p-2 rounded-xl transition-colors ${feedback === 'down' ? 'text-rose-400 bg-rose-400/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                    >
                        <ThumbsDown className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default InsightCard;

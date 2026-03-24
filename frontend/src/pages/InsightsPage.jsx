import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import InsightCard from '../components/insights/InsightCard';
import { getInsights } from '../data/mockInsights';

const InsightsPage = () => {
    const [insights, setInsights] = useState([]);

    useEffect(() => {
        setInsights(getInsights());
    }, []);

    return (
        <div className="max-w-2xl mx-auto pb-24">
            {/* Header */}
            <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-linear-to-br from-purple-500/20 to-blue-500/20 mb-4 border border-white/5">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <h1 className="text-4xl font-black mb-2 bg-linear-to-r from-purple-200 via-white to-blue-200 bg-clip-text text-transparent">
                    AI Insights
                </h1>
                <p className="text-white/60">Smart observations from your habits.</p>
            </div>

            {/* Feed */}
            <div className="space-y-6">
                {insights.map((insight, index) => (
                    <InsightCard key={insight.id} insight={insight} index={index} />
                ))}
            </div>

            <div className="text-center mt-12 text-sm text-white/20 font-medium">
                Scanning for more patterns...
            </div>
        </div>
    );
};

export default InsightsPage;

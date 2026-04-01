import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import InsightCard from '../components/insights/InsightCard';
import { buildDiabetesRecommendations, toInsightCards } from '../services/diabetesRecommendationService';
import { getGoogleFitActivity } from '../services/googleFitService';
import { getDailyStats } from '../services/mealService';
import { calculateDiabetesNutritionPlan, getUserProfile } from '../services/userService';

const sortActivityRows = (rows = []) =>
    [...rows].sort((a, b) => String(b.activity_date || '').localeCompare(String(a.activity_date || '')));

const getTodayActivity = (rows = []) => {
    const today = new Date().toLocaleDateString('en-CA');
    return rows.find((row) => row.activity_date === today) || rows[0] || null;
};

const InsightsPage = () => {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInsights = async () => {
            try {
                const [stats, profile, activity] = await Promise.all([
                    getDailyStats(),
                    getUserProfile(),
                    getGoogleFitActivity(7).catch(() => ({ items: [] })),
                ]);

                const latestActivity = getTodayActivity(sortActivityRows(activity.items || []));
                const plan = calculateDiabetesNutritionPlan(profile || {}, Number(latestActivity?.calories_burned || 0));
                const guidance = buildDiabetesRecommendations({
                    profile: profile || {},
                    meals: stats.meals || [],
                    activity: latestActivity,
                    nutritionPlan: plan,
                });
                setInsights(toInsightCards(guidance));
            } catch (error) {
                console.error('Failed to load diabetes insights', error);
                setInsights([]);
            } finally {
                setLoading(false);
            }
        };

        loadInsights();
    }, []);

    return (
        <div className="max-w-2xl mx-auto pb-24">
            <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-linear-to-br from-emerald-500/20 to-sky-500/20 mb-4 border border-white/5">
                    <Sparkles className="w-6 h-6 text-emerald-300" />
                </div>
                <h1 className="text-4xl font-black mb-2 bg-linear-to-r from-emerald-200 via-white to-sky-200 bg-clip-text text-transparent">
                    Diabetes Insights
                </h1>
                <p className="text-white/60">Guidance built from your meals, activity, and diabetes profile.</p>
            </div>

            <div className="space-y-6">
                {insights.map((insight, index) => (
                    <InsightCard key={insight.id} insight={insight} index={index} />
                ))}
                {!loading && insights.length === 0 ? (
                    <div className="rounded-[2rem] border border-dashed border-white/10 p-8 text-center text-white/45">
                        Complete your diabetes profile, sync activity, and log meals to generate personalized insights.
                    </div>
                ) : null}
            </div>

            <div className="text-center mt-12 text-sm text-white/20 font-medium">
                {loading ? 'Analyzing your recent patterns...' : 'Insights update as your meals and activity change.'}
            </div>
        </div>
    );
};

export default InsightsPage;


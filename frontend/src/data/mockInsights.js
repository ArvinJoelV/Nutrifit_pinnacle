import { Lightbulb, Zap, TrendingUp, Moon } from 'lucide-react';

export const getInsights = () => {
    return [
        {
            id: 1,
            type: 'positive',
            category: 'Nutrition',
            title: 'Protein Power',
            message: "Your focus levels are 20% higher on days you eat a high-protein breakfast.",
            action: "Keep it up!",
            icon: Zap,
            color: "from-amber-400 to-orange-500"
        },
        {
            id: 2,
            type: 'warning',
            category: 'Sleep',
            title: 'Late Night Snacking',
            message: "Eating after 9 PM seems to correlate with a 15% drop in your sleep quality.",
            action: "Try eating earlier.",
            icon: Moon,
            color: "from-indigo-400 to-purple-500"
        },
        {
            id: 3,
            type: 'tip',
            category: 'Energy',
            title: 'Fiber Boost',
            message: "Adding more fiber to lunch prevents your afternoon energy slump.",
            action: "Add veggies to lunch.",
            icon: TrendingUp,
            color: "from-emerald-400 to-teal-500"
        },
        {
            id: 4,
            type: 'positive',
            category: 'Hydration',
            title: 'Well Hydrated',
            message: "You've hit your water goal for 5 days straight. Your skin is glowing!",
            action: "Great job!",
            icon: Lightbulb,
            color: "from-blue-400 to-cyan-500"
        }
    ];
};

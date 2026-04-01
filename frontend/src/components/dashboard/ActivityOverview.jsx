import React from 'react';
import { Footprints, Flame, HeartPulse, Route } from 'lucide-react';

const cards = [
    { key: 'steps', label: 'Steps', icon: Footprints, unit: 'steps', color: '#22c55e' },
    { key: 'caloriesBurned', label: 'Calories Burned', icon: Flame, unit: 'kcal', color: '#f97316' },
    { key: 'distance', label: 'Distance', icon: Route, unit: 'km', color: '#38bdf8' },
    { key: 'heartRate', label: 'Heart Rate', icon: HeartPulse, unit: 'bpm avg', color: '#ef4444' },
];

const ActivityOverview = ({ activity }) => {
    return (
        <div className="col-span-12 lg:col-span-6 bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold">Activity Data</h3>
                    <p className="text-sm text-white/45 mt-1">Latest synced health metrics</p>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/35">
                    {activity?.activity_date || 'Not synced'}
                </div>
            </div>

            {activity ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        const value = activity[card.key];
                        return (
                            <div key={card.key} className="rounded-[2rem] border border-white/10 bg-black/20 p-5 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-xs font-bold uppercase tracking-widest text-white/40">{card.label}</div>
                                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-3xl font-black">
                                    {value}
                                    <span className="ml-2 text-sm text-white/40 font-medium">{card.unit}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-[2rem] border border-dashed border-white/10 p-6 text-white/45 text-sm">
                    Connect Google Fit in Settings and run a sync to show your activity data here.
                </div>
            )}
        </div>
    );
};

export default ActivityOverview;


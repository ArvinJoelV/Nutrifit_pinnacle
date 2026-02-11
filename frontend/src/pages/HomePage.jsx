import React from 'react';
import { motion } from 'framer-motion';
import WelcomeCard from '../components/dashboard/WelcomeCard';
import MacroSummary from '../components/dashboard/MacroSummary';
import QuickActions from '../components/dashboard/QuickActions';
import RecentMeals from '../components/dashboard/RecentMeals';
import EatEffectWidget from '../components/dashboard/EatEffectWidget';
import { dashboardData } from '../data/mockDashboardData';

const HomePage = () => {
  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="grid grid-cols-12 gap-6">
        {/* Welcome Section */}
        <WelcomeCard user={dashboardData.user} />

        {/* Macros & Quick Actions */}
        <MacroSummary macros={dashboardData.macros} />
        <QuickActions />

        {/* Bottom Section */}
        <RecentMeals meals={dashboardData.recentMeals} />
        <EatEffectWidget data={dashboardData.eatEffect} />
      </div>
    </div>
  );
};

export default HomePage;

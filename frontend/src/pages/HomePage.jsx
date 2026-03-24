import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import WelcomeCard from '../components/dashboard/WelcomeCard';
import MacroSummary from '../components/dashboard/MacroSummary';
import QuickActions from '../components/dashboard/QuickActions';
import RecentMeals from '../components/dashboard/RecentMeals';
import EatEffectWidget from '../components/dashboard/EatEffectWidget';
import { dashboardData } from '../data/mockDashboardData';
import { getDailyStats } from '../services/mealService';
import { getUserProfile, calculateMacroTargets } from '../services/userService';
import { useOnboarding } from '../contexts/OnboardingContext';

const HomePage = () => {
  const { formData } = useOnboarding(); // Local fallback if Firestore profile is unavailable
  const [dailyStats, setDailyStats] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [userProfile, setUserProfile] = useState(null);
  const [macroTargets, setMacroTargets] = useState({ protein: 160, carbs: 250, fat: 70 }); // Defaults
  const [recentMeals, setRecentMeals] = useState([]);

  // Helper to fetch data
  const fetchData = async () => {
    try {
      const [stats, profile] = await Promise.all([
        getDailyStats(),
        getUserProfile()
      ]);

      setDailyStats(stats.totals);
      setRecentMeals(stats.meals.slice(0, 3));

      if (profile) {
        setUserProfile(profile);
        const targets = calculateMacroTargets(profile.target_calories || 2200);
        setMacroTargets(targets);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard stats", e);
    }
  };

  useEffect(() => {
    fetchData();
    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const currentName = userProfile?.firstName || formData?.firstName || 'Friend';
  const targetCalories = userProfile?.target_calories || 2200;

  // Update MacroSummary to accept dynamic props? 
  // currently MacroSummary might expect a specific structure.
  // We'll pass our calculated stats overlaid on the mock "goals".
  const dynamicMacros = {
    calories: { ...dashboardData.macros.calories, current: dailyStats.calories, target: targetCalories },
    protein: { ...dashboardData.macros.protein, current: dailyStats.protein, target: macroTargets.protein },
    carbs: { ...dashboardData.macros.carbs, current: dailyStats.carbs, target: macroTargets.carbs },
    fat: { ...dashboardData.macros.fat, current: dailyStats.fat, target: macroTargets.fat }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="grid grid-cols-12 gap-6">
        {/* Welcome Section */}
        <WelcomeCard user={{ ...dashboardData.user, name: currentName }} />

        {/* Macros & Quick Actions */}
        <MacroSummary macros={dynamicMacros} />
        <QuickActions />

        {/* Bottom Section */}
        <RecentMeals meals={recentMeals.length > 0 ? recentMeals : dashboardData.recentMeals} />
        <EatEffectWidget data={dashboardData.eatEffect} />
      </div>
    </div>
  );
};

export default HomePage;

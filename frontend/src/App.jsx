import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RedirectHandler from './components/RedirectHandler';
import { OnboardingProvider } from './contexts/OnboardingContext';

import LogFoodPage from './pages/LogFoodPage';
import InsightsPage from './pages/InsightsPage';
import EatEffectPage from './pages/EatEffectPage';
import ProgressPage from './pages/ProgressPage';
import ProfilePage from './pages/ProfilePage';
import AppLayout from './components/layout/AppLayout';
import PhotoLogPage from './pages/log/PhotoLogPage';

import ConfirmMealPage from './pages/log/ConfirmMealPage';
import MealDetailPage from './pages/log/MealDetailPage';
import MealSimulatorPage from './pages/log/MealSimulatorPage';
import SearchLogPage from './pages/log/SearchLogPage';

// Onboarding Pages
import WelcomePage from './pages/onboarding/WelcomePage';
import BasicInfoPage from './pages/onboarding/BasicInfoPage';
import ActivityPage from './pages/onboarding/ActivityPage';
import GoalPage from './pages/onboarding/GoalPage';
import LifestylePage from './pages/onboarding/LifestylePage';
import ProcessingPage from './pages/onboarding/ProcessingPage';

// Authenticated Route Wrapper
const AuthenticatedRoute = ({ children }) => (
  <RedirectHandler>
    <AppLayout>
      {children}
    </AppLayout>
  </RedirectHandler>
);

function App() {
  return (
    <OnboardingProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route path="/home" element={
            <AuthenticatedRoute>
              <HomePage />
            </AuthenticatedRoute>
          } />

          <Route path="/log" element={
            <AuthenticatedRoute>
              <LogFoodPage />
            </AuthenticatedRoute>
          } />

          <Route path="/log/photo" element={
            <AuthenticatedRoute>
              <PhotoLogPage />
            </AuthenticatedRoute>
          } />

          <Route path="/log/confirm" element={
            <AuthenticatedRoute>
              <ConfirmMealPage />
            </AuthenticatedRoute>
          } />

          <Route path="/meal/:id" element={
            <AuthenticatedRoute>
              <MealDetailPage />
            </AuthenticatedRoute>
          } />

          <Route path="/meal/:id/simulator" element={
            <AuthenticatedRoute>
              <MealSimulatorPage />
            </AuthenticatedRoute>
          } />

          <Route path="/log/search" element={
            <AuthenticatedRoute>
              <SearchLogPage />
            </AuthenticatedRoute>
          } />



          <Route path="/insights" element={
            <AuthenticatedRoute>
              <InsightsPage />
            </AuthenticatedRoute>
          } />

          <Route path="/eat-effect" element={
            <AuthenticatedRoute>
              <EatEffectPage />
            </AuthenticatedRoute>
          } />

          <Route path="/progress" element={
            <AuthenticatedRoute>
              <ProgressPage />
            </AuthenticatedRoute>
          } />

          <Route path="/profile" element={
            <AuthenticatedRoute>
              <ProfilePage />
            </AuthenticatedRoute>
          } />

          {/* Onboarding Routes */}
          <Route path="/onboarding/welcome" element={
            <RedirectHandler>
              <WelcomePage />
            </RedirectHandler>
          } />
          <Route path="/onboarding/basic-info" element={
            <RedirectHandler>
              <BasicInfoPage />
            </RedirectHandler>
          } />
          <Route path="/onboarding/activity" element={
            <RedirectHandler>
              <ActivityPage />
            </RedirectHandler>
          } />
          <Route path="/onboarding/goal" element={
            <RedirectHandler>
              <GoalPage />
            </RedirectHandler>
          } />
          <Route path="/onboarding/lifestyle" element={
            <RedirectHandler>
              <LifestylePage />
            </RedirectHandler>
          } />
          <Route path="/onboarding/processing" element={
            <RedirectHandler>
              <ProcessingPage />
            </RedirectHandler>
          } />

          {/* Legacy Redirect */}
          <Route path="/onboarding/start" element={<Navigate to="/onboarding/welcome" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </OnboardingProvider>
  );
}

export default App;
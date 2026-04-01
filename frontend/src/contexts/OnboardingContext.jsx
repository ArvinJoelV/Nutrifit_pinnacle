/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext();

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
};

export const OnboardingProvider = ({ children }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        activity_level: '',
        goal: '',
        diabetes_type: 'type2',
        hba1c: '',
        fasting_glucose: '',
        post_meal_glucose: '',
        hypoglycemia_history: 'no',
        medication_type: '',
        insulin_usage: 'no',
        diabetes_duration_years: '',
        diet_preference: '',
        food_allergies: '',
        meal_schedule: 'standard',
        alcohol_consumption: 'none',
        sleep_hours: '',
        stress_level: 0,
        medical_condition: '',
        maintenance_calories: 0,
        target_calories: 0,
    });

    const updateFormData = (newData) => {
        setFormData((prev) => ({ ...prev, ...newData }));
    };

    return (
        <OnboardingContext.Provider value={{ formData, updateFormData }}>
            {children}
        </OnboardingContext.Provider>
    );
};
